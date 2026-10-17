import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  Observable,
  Subscription,
  concat,
  defer,
  forkJoin,
  ignoreElements,
  of,
  switchMap,
  timer,
} from 'rxjs';
import { BUSINESS_INFO } from '../../../../core/config/business.config';
import { AppError } from '../../../../core/http/app-error';
import { Sale } from '../../../../core/models/order.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { OrderService } from '../../../storefront/services/order.service';
import {
  CardPayment,
  CASH_SHORTCUTS,
  DOCUMENT_OPTIONS,
  DocumentKind,
  PAYMENT_OPTIONS,
  PaymentMethod,
  PosLine,
  Receipt,
} from '../../models/checkout.model';
import { CardDecision, authorizeCard } from '../../payment/card-authorization';
import { beep } from '../../payment/terminal-beep';
import { terminalErrorMessage } from '../../payment/terminal-protocol';
import { formatReceipt } from '../../receipt/receipt-format';
import { CardTerminal } from '../../services/card-terminal';
import { TicketPrinter } from '../../services/ticket-printer';
import { PaymentTerminal, TerminalScreen } from '../payment-terminal/payment-terminal';
import { KeypadKey, PosKeypad, applyKeypadKey } from '../pos-keypad/pos-keypad';

type CheckoutPhase = 'pago' | 'tarjeta' | 'procesando' | 'imprimiendo' | 'listo';

const MIN_PROCESSING_MS = 1_800;
// Tiempo mínimo en "Conectando con POS…", aunque la terminal ya esté conectada.
const CONNECTING_MS = 1_500;
const READING_MS = 800;
const AUTHORIZATION_STEPS: readonly [mensaje: string, ms: number][] = [
  ['Conectando con el banco…', 900],
  ['Enviando transacción…', 800],
  ['Esperando respuesta…', 1_000],
];
const APPROVED_HOLD_MS = 1_800;

/** Muestra una pantalla de la terminal durante cierto tiempo. */
function show(screen: TerminalScreen, ms: number): Observable<TerminalScreen> {
  return concat(of(screen), timer(ms).pipe(ignoreElements()));
}

function after<T>(ms: number, value: T): Observable<T> {
  return new Observable<T>((subscriber) => {
    const timeout = setTimeout(
      () => {
        subscriber.next(value);
        subscriber.complete();
      },
      Math.max(0, ms),
    );
    return () => clearTimeout(timeout);
  });
}

@Component({
  selector: 'app-checkout-dialog',
  imports: [MoneyPipe, PaymentTerminal, PosKeypad],
  templateUrl: './checkout-dialog.html',
  host: { '(document:keydown.escape)': 'cancel()' },
})
export class CheckoutDialog {
  private readonly orders = inject(OrderService);
  private readonly printer = inject(TicketPrinter);
  protected readonly terminal = inject(CardTerminal);
  private readonly destroyRef = inject(DestroyRef);

  readonly lines = input.required<readonly PosLine[]>();
  readonly total = input.required<number>();
  readonly cashier = input.required<string>();

  readonly completed = output<void>();
  readonly cancelled = output<void>();

  protected readonly documentOptions = DOCUMENT_OPTIONS;
  protected readonly paymentOptions = PAYMENT_OPTIONS;
  protected readonly cashShortcuts = CASH_SHORTCUTS;

  protected readonly phase = signal<CheckoutPhase>('pago');
  protected readonly document = signal<DocumentKind>('TICKET');
  protected readonly method = signal<PaymentMethod>('EFECTIVO');
  protected readonly cashText = signal('');
  protected readonly error = signal<string | null>(null);
  protected readonly receipt = signal<Receipt | null>(null);
  protected readonly printed = signal<readonly string[]>([]);
  protected readonly cardScreen = signal<TerminalScreen>({ kind: 'conectando' });
  private cardCharge: Subscription | null = null;

  protected readonly cash = computed(() => {
    const value = Number(this.cashText());
    return this.cashText() === '' || Number.isNaN(value) ? null : value;
  });
  protected readonly change = computed(() => (this.cash() ?? 0) - this.total());
  protected readonly short = computed(() => this.cash() !== null && this.change() < -0.0001);
  protected readonly changeAmount = computed(() => Math.abs(this.change()));
  protected readonly canConfirm = computed(() => this.cash() !== null && !this.short());
  protected readonly canCancelCard = computed(() =>
    ['conectando', 'presentar'].includes(this.cardScreen().kind),
  );
  protected readonly cardFailed = computed(() =>
    ['sin-pos', 'declinada', 'no-procesada', 'anulada', 'error'].includes(this.cardScreen().kind),
  );

  protected selectMethod(method: PaymentMethod): void {
    this.error.set(null);
    if (method === 'TARJETA') {
      this.startCard();
    } else {
      this.method.set(method);
    }
  }

  protected press(key: KeypadKey): void {
    this.cashText.update((value) => applyKeypadKey(value, key));
  }

  protected typeCash(value: string): void {
    this.cashText.set(value.trim());
  }

  protected addCash(amount: number): void {
    this.cashText.set(String((this.cash() ?? 0) + amount));
  }

  protected exactCash(): void {
    this.cashText.set(this.total().toFixed(2));
  }

  protected cancel(): void {
    if (this.canCancelCard() && this.phase() === 'tarjeta') {
      this.cancelCard();
    } else if (this.cardFailed() && this.phase() === 'tarjeta') {
      this.backToPayment();
    } else if (this.phase() === 'pago') {
      this.cancelled.emit();
    }
  }

  protected confirm(): void {
    if (!this.canConfirm()) {
      return;
    }

    this.error.set(null);
    this.registerSale(this.cash() ?? this.total(), null);
  }

  protected cancelCard(): void {
    this.cardCharge?.unsubscribe();
    this.cardCharge = null;
    this.backToPayment();
  }

  protected retryCard(): void {
    this.startCard();
  }

  protected backToPayment(): void {
    this.method.set('EFECTIVO');
    this.phase.set('pago');
  }

  /**
   * Abre la terminal: "Conectando con POS…" y luego pide la tarjeta. Si no hay
   * terminal, la conecta (el clic del cajero permite abrir el selector de puertos).
   */
  private startCard(): void {
    this.method.set('TARJETA');
    this.phase.set('tarjeta');
    this.cardScreen.set({ kind: 'conectando' });
    this.cardCharge = forkJoin([defer(() => this.terminal.connect()), timer(CONNECTING_MS)])
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.cardCharge = null;
          this.chargeCard();
        },
        error: (error) => {
          this.cardCharge = null;
          beep('rechazada');
          this.cardScreen.set({ kind: 'sin-pos', detalle: terminalErrorMessage(error) });
        },
      });
  }

  private chargeCard(): void {
    const amount = this.total();
    let decision: CardDecision | null = null;

    this.cardScreen.set({ kind: 'presentar' });
    beep('presentar');
    this.cardCharge = this.terminal
      .charge(amount)
      .pipe(
        switchMap((read) => {
          beep('lectura');
          decision = authorizeCard(read, amount);
          return concat(
            show({ kind: 'leyendo' }, READING_MS),
            ...AUTHORIZATION_STEPS.map(([mensaje, ms]) =>
              show({ kind: 'autorizando', mensaje }, ms),
            ),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (screen) => this.cardScreen.set(screen),
        complete: () => {
          this.cardCharge = null;
          if (decision) {
            this.resolveCard(decision);
          }
        },
        error: (error) => {
          this.cardCharge = null;
          beep('rechazada');
          this.cardScreen.set({ kind: 'error', mensaje: terminalErrorMessage(error) });
        },
      });
  }

  private resolveCard(decision: CardDecision): void {
    if (!decision.aprobada) {
      beep('rechazada');
      this.cardScreen.set({
        kind: decision.temporal ? 'no-procesada' : 'declinada',
        mensaje: decision.motivo,
      });
      return;
    }

    const pago = decision.pago;
    beep('aprobada');
    this.cardScreen.set({ kind: 'aprobada', pago });
    this.cardCharge = timer(APPROVED_HOLD_MS)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.cardCharge = null;
        this.registerSale(this.total(), pago);
      });
  }

  private registerSale(recibido: number, tarjeta: CardPayment | null): void {
    this.phase.set('procesando');
    const startedAt = Date.now();

    this.orders
      .counterSale({
        lineas: this.lines().map((line) => ({
          productoId: line.product.id,
          cantidad: line.quantity,
        })),
      })
      .pipe(
        switchMap((sale) => after(MIN_PROCESSING_MS - (Date.now() - startedAt), sale)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (sale) => this.print(this.toReceipt(sale, recibido, tarjeta)),
        error: (error: AppError) => {
          const message = error.message ?? 'No se pudo registrar la venta.';
          if (tarjeta) {
            // La venta no existe: se revierte el cobro ya autorizado.
            beep('rechazada');
            this.cardScreen.set({
              kind: 'anulada',
              mensaje: `${message} No se realizó ningún cargo.`,
            });
            this.phase.set('tarjeta');
          } else {
            this.error.set(message);
            this.phase.set('pago');
          }
        },
      });
  }

  protected reprint(): void {
    const receipt = this.receipt();
    if (receipt) {
      this.print(receipt);
    }
  }

  protected finish(): void {
    this.completed.emit();
  }

  private print(receipt: Receipt): void {
    this.receipt.set(receipt);
    this.printed.set([]);
    this.phase.set('imprimiendo');

    this.printer
      .print(formatReceipt(receipt, BUSINESS_INFO))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (line) => this.printed.update((lines) => [...lines, line]),
        complete: () => this.phase.set('listo'),
      });
  }

  private toReceipt(sale: Sale, recibido: number, tarjeta: CardPayment | null): Receipt {
    const lineas = sale.detalles?.length
      ? sale.detalles.map((detail) => ({
          cantidad: detail.cantidad,
          descripcion: detail.producto,
          precio: Number(detail.precio),
          importe: Number(detail.subtotal),
        }))
      : this.lines().map((line) => ({
          cantidad: line.quantity,
          descripcion: line.product.nombre,
          precio: Number(line.product.precio),
          importe: Number(line.product.precio) * line.quantity,
        }));
    const total = Number(sale.total);

    return {
      numero: sale.id,
      fecha: sale.fecha ? new Date(sale.fecha) : new Date(),
      cajero: this.cashier(),
      documento: this.document(),
      metodo: this.method(),
      lineas,
      total,
      recibido,
      cambio: Math.max(0, recibido - total),
      tarjeta,
    };
  }
}
