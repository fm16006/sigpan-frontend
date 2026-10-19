import { Component, computed, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { BUSINESS_INFO } from '../../../../core/config/business.config';
import { CashCut } from '../../../../core/models/order.model';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderService } from '../../../storefront/services/order.service';
import { ARQUEO_DENOMINATIONS, arqueoTotal, denominationLabel } from '../../pos-logic';
import { CashRegisterStore } from '../../services/cash-register.store';
import { valueOr } from '../../../../core/http/resource-value';

/**
 * Cierre de caja. Lo que el backend entrega hoy (corte del día) se muestra de verdad; el
 * arqueo se cuenta en el navegador y el turno vive en `CashRegisterStore`. Método de pago,
 * retiros y anulación no existen en el backend: se muestran como "Próximamente" con su
 * historia de usuario.
 */
@Component({
  selector: 'app-pos-caja',
  imports: [DatePipe, MoneyPipe, StatusChip, ConfirmDialog],
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

  protected readonly caja = BUSINESS_INFO.caja;
  protected readonly turno = this.register.turno;
  protected readonly denominations = ARQUEO_DENOMINATIONS;
  protected readonly cutDate = signal(todayIso());
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly counted = computed(() => arqueoTotal(this.counts()));
  protected readonly confirmOpen = signal(false);

  protected readonly cut = httpResource<CashCut>(() => this.orders.cashCutUrl(this.cutDate()));
  protected readonly cutValue = computed(() => valueOr(this.cut, undefined));

  protected count(value: number): number {
    return this.counts()[value] ?? 0;
  }

  protected adjust(value: number, delta: number): void {
    this.counts.update((counts) => ({ ...counts, [value]: Math.max(0, (counts[value] ?? 0) + delta) }));
  }

  protected readonly label = denominationLabel;

  protected isCancelled(estado: string): boolean {
    return estado === 'CANCELADO';
  }

  protected closeRegister(): void {
    this.confirmOpen.set(false);
    this.register.cerrar(this.counted());
    this.closed.emit();
  }
}
