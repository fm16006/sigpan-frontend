import {
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';
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
import { CashRegisterStore } from '../../services/cash-register.store';
import {
  CardPayment,
  CASH_SHORTCUTS,
  DOCUMENT_OPTIONS,
  DocumentKind,
  PAYMENT_OPTIONS,
  PaymentMethod,
  PaymentOptionId,
  PosLine,
  Receipt,
} from '../../models/checkout.model';
import { CardDecision, authorizeCard } from '../../payment/card-authorization';
import { addCash, cashChange, parseCash, roundMoney } from '../../payment/cash';
import { beep } from '../../payment/terminal-beep';
import { terminalErrorMessage } from '../../payment/terminal-protocol';
import { formatReceipt } from '../../receipt/receipt-format';
import { CardTerminal } from '../../services/card-terminal';
import { TicketPrinter } from '../../services/ticket-printer';
import { PaymentTerminal, TerminalScreen } from '../payment-terminal/payment-terminal';

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
  imports: [MoneyPipe, PaymentTerminal],
  templateUrl: './checkout-dialog.html',
  host: {
    '(document:keydown.escape)': 'cancel()',
    '(document:keydown.enter)': 'onEnter($event)',
  },
})
export class CheckoutDialog {
  private readonly orders = inject(OrderService);
  private readonly printer = inject(TicketPrinter);
  private readonly register = inject(CashRegisterStore);
  protected readonly terminal = inject(CardTerminal);
  private readonly destroyRef = inject(DestroyRef);

  readonly lines = input.required<readonly PosLine[]>();
  readonly total = input.required<number>();
  readonly cashier = input.required<string>();
  /** Ahorro de la cotización, solo para mostrarlo en el cobro. */
  readonly savings = input(0);

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
  /** El ticket completo, para la impresión del navegador (solo se ve al imprimir). */
  protected readonly receiptText = computed(() => {
    const receipt = this.receipt();
    return receipt ? formatReceipt(receipt, BUSINESS_INFO).join('\n') : '';
  });
  private readonly page = inject(DOCUMENT);
  protected readonly cardScreen = signal<TerminalScreen>({ kind: 'conectando' });
  private cardCharge: Subscription | null = null;

  private readonly cashInput = viewChild<ElementRef<HTMLInputElement>>('cashInput');

  protected readonly itemCount = computed(() =>
    this.lines().reduce((sum, line) => sum + line.quantity, 0),
  );
  protected readonly cash = computed(() => parseCash(this.cashText()));
  /** Cambio (o faltante) a dos decimales; sin monto recibido todavía es null. */
  protected readonly change = computed(() => {
    const cash = this.cash();
    return cash === null ? null : cashChange(cash, this.total());
  });
  protected readonly short = computed(() => this.change()?.short ?? false);
  protected readonly changeAmount = computed(() => this.change()?.amount ?? 0);
  /** Efectivo exige haber recibido al menos el total; tarjeta se confirma con la terminal. */
  protected readonly canConfirm = computed(() =>
    this.method() === 'TARJETA' ? true : this.cash() !== null && !this.short(),
  );
  protected readonly canCancelCard = computed(() =>
    ['conectando', 'presentar'].includes(this.cardScreen().kind),
  );
  protected readonly cardFailed = computed(() =>
    ['sin-pos', 'declinada', 'no-procesada', 'anulada', 'error'].includes(this.cardScreen().kind),
  );

  constructor() {
    // El foco cae en el campo de efectivo apenas aparece, para teclear y confirmar con Enter.
    effect(() => this.cashInput()?.nativeElement.focus());
  }

  protected selectMethod(option: PaymentOptionId): void {
    if (option === 'MIXTO' || this.phase() !== 'pago') {
      return;
    }
    this.error.set(null);
    this.method.set(option);
  }

  protected typeCash(value: string): void {
    this.cashText.set(value.trim());
  }

  protected addCash(amount: number): void {
    this.cashText.set(addCash(this.cashText(), amount));
    this.focusCash();
  }

  protected exactCash(): void {
    this.cashText.set(roundMoney(this.total()).toFixed(2));
    this.focusCash();
  }

  protected clearCash(): void {
    this.cashText.set('');
    this.focusCash();
  }

  private focusCash(): void {
    this.cashInput()?.nativeElement.focus();
  }

  /** Enter confirma la venta, salvo que el foco esté en un botón (ahí Enter lo pulsa). */
  protected onEnter(event: Event): void {
    const target = event.target as HTMLElement | null;
    if (this.phase() !== 'pago' || target?.closest('button, a')) {
      return;
    }
    event.preventDefault();
    this.confirm();
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
    if (this.phase() !== 'pago' || !this.canConfirm()) {
      return;
    }

    this.error.set(null);
    if (this.method() === 'TARJETA') {
      this.startCard();
    } else {
      this.registerSale(this.cash() ?? this.total(), null);
    }
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
        // Sin caja registrada (turno anterior a HU-60) el backend usa la primera de la sucursal.
        ...(this.register.lugar()?.cajaId != null ? { cajaId: this.register.lugar()!.cajaId! } : {}),
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

  /** Abre la impresión del navegador; la hoja de estilos de impresión deja solo el ticket. */
  protected printReceipt(): void {
    this.page.defaultView?.print();
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
      sucursal: sale.sucursal ?? this.register.lugar()?.sucursal ?? '',
      caja: sale.caja ?? this.register.lugar()?.caja ?? '',
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
