import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { EMPTY_PAGE, Page } from '../../../../core/models/api.model';
import { CashShift, CashierOption, RegisterStatus, Sale } from '../../../../core/models/order.model';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { differenceLabel, isoDaysAgo } from '../../register-status';

const PAGE_SIZE = 20;

/**
 * HU-68, pestaña Cortes del punto de venta: turnos cerrados por fecha de apertura, caja y cajero,
 * con los que no cuadraron a mano. Cada corte abre sus ventas. El cajero solo ve los suyos (lo
 * filtra el servidor).
 */
@Component({
  selector: 'app-shift-history',
  imports: [DatePipe, MoneyPipe, ResourceState, StatusChip, FormDrawer],
  templateUrl: './shift-history.html',
})
export class ShiftHistory {
  private readonly api = inject(ApiClient);

  protected readonly today = todayIso();
  protected readonly from = signal(isoDaysAgo(7));
  protected readonly to = signal(todayIso());
  protected readonly cajaId = signal<number | null>(null);
  protected readonly cajeroId = signal<number | null>(null);
  protected readonly onlyDifferences = signal(false);
  protected readonly page = signal(0);

  protected readonly rangeInvalid = computed(() => !!this.from() && !!this.to() && this.from() > this.to());

  protected readonly source = httpResource<Page<CashShift>>(
    () =>
      this.rangeInvalid()
        ? undefined
        : this.api.url(API_ENDPOINTS.turnos.historial, {
            desde: this.from() || undefined,
            hasta: this.to() || undefined,
            cajaId: this.cajaId(),
            cajeroId: this.cajeroId(),
            soloConDiferencia: this.onlyDifferences() || undefined,
            pagina: this.page(),
            tamano: PAGE_SIZE,
          }),
    { defaultValue: EMPTY_PAGE },
  );
  protected readonly result = computed(() => valueOr(this.source, EMPTY_PAGE));

  private readonly registersRes = httpResource<RegisterStatus[]>(() => this.api.url(API_ENDPOINTS.turnos.cajas), {
    defaultValue: [],
  });
  protected readonly registers = computed(() => valueOr(this.registersRes, []));
  private readonly cashiersRes = httpResource<CashierOption[]>(
    () => this.api.url(API_ENDPOINTS.turnos.cajeros, { soloLibres: false }),
    { defaultValue: [] },
  );
  protected readonly cashiers = computed(() => valueOr(this.cashiersRes, []));

  /** Corte abierto en el panel lateral, con sus ventas. */
  protected readonly selected = signal<CashShift | null>(null);
  protected readonly salesRes = httpResource<Sale[]>(
    () => {
      const shift = this.selected();
      return shift ? this.api.url(API_ENDPOINTS.turnos.ventas(shift.id)) : undefined;
    },
    { defaultValue: [] },
  );
  protected readonly sales = computed(() => valueOr(this.salesRes, []));

  protected readonly difference = differenceLabel;

  // Cualquier filtro nuevo vuelve a la primera página.
  protected setFrom(value: string): void {
    this.from.set(value);
    this.page.set(0);
  }

  protected setTo(value: string): void {
    this.to.set(value);
    this.page.set(0);
  }

  protected setCaja(value: string): void {
    this.cajaId.set(value ? Number(value) : null);
    this.page.set(0);
  }

  protected setCajero(value: string): void {
    this.cajeroId.set(value ? Number(value) : null);
    this.page.set(0);
  }

  protected toggleDifferences(): void {
    this.onlyDifferences.update((value) => !value);
    this.page.set(0);
  }

  protected goTo(page: number): void {
    const last = Math.max(0, this.result().totalPages - 1);
    this.page.set(Math.min(Math.max(0, page), last));
  }
}
