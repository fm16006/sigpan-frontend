import { Component, computed, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { CashCut } from '../../../../core/models/order.model';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderService } from '../../../storefront/services/order.service';
import {
  CashierHandover,
  HandoverShift,
} from '../../../cash-registers/ui/cashier-handover/cashier-handover';
import { ARQUEO_DENOMINATIONS, arqueoTotal, denominationLabel } from '../../pos-logic';
import { isCancelled, summarizeSales } from '../../pos-pedidos-logic';
import { registerLabel } from '../../register-utils';
import { CashRegisterStore } from '../../services/cash-register.store';
import { valueOr } from '../../../../core/http/resource-value';

/** HU-38: cierre del turno con arqueo; el servidor calcula esperado y diferencia. */
@Component({
  selector: 'app-pos-caja',
  imports: [DatePipe, MoneyPipe, StatusChip, ConfirmDialog, CashierHandover],
  templateUrl: './pos-caja.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200' },
})
export class PosCaja {
  private readonly orders = inject(OrderService);
  private readonly register = inject(CashRegisterStore);

  readonly cashier = input('');
  readonly back = output<void>();
  /** Se cerró el turno: la pantalla vuelve a "Abrir caja". */
  readonly closed = output<void>();

  protected readonly turno = this.register.turno;
  protected readonly place = computed(() => registerLabel(this.register.lugar()?.caja));

  protected readonly denominations = ARQUEO_DENOMINATIONS;
  protected readonly cutDate = signal(todayIso());
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly counted = computed(() => arqueoTotal(this.counts()));
  protected readonly confirmOpen = signal(false);
  protected readonly closing = signal(false);
  /** Contado menos esperado, como lo calcula el servidor. */
  protected readonly difference = computed(() => this.counted() - (this.turno()?.esperado ?? 0));

  /** HU-68: pasar el turno abierto a otro cajero sin cerrarlo. */
  protected readonly handoverOpen = signal(false);
  protected readonly handoverShift = computed<HandoverShift | null>(() => {
    const shift = this.turno();
    return shift ? { id: shift.id, caja: shift.lugar?.caja ?? 'Caja', usuario: shift.cajero } : null;
  });

  protected readonly cut = httpResource<CashCut>(() => this.orders.cashCutUrl(this.cutDate()));
  protected readonly cutValue = computed(() => valueOr(this.cut, undefined));
  /** DEF-18: el corte lista las anuladas (HU-37) aunque no sumen; acá se cuentan aparte. */
  protected readonly voidedCount = computed(() => summarizeSales(this.cutValue()?.ventas ?? []).anuladas);

  protected count(value: number): number {
    return this.counts()[value] ?? 0;
  }

  protected adjust(value: number, delta: number): void {
    this.counts.update((counts) => ({ ...counts, [value]: Math.max(0, (counts[value] ?? 0) + delta) }));
  }

  protected readonly label = denominationLabel;

  protected refresh(): void {
    this.register.refrescar();
    this.cut.reload();
  }

  protected readonly isCancelled = isCancelled;

  /** El turno ya es de otro: este cajero queda sin caja y la pantalla vuelve a la apertura. */
  protected handedOver(): void {
    this.handoverOpen.set(false);
    this.register.refrescar();
    this.closed.emit();
  }

  protected closeRegister(): void {
    this.confirmOpen.set(false);
    this.closing.set(true);
    this.register.cerrar(this.counted()).subscribe({
      next: () => {
        this.closing.set(false);
        this.closed.emit();
      },
      error: () => this.closing.set(false),
    });
  }
}
