import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { CashShift, RegisterStatus } from '../../../../core/models/order.model';
import { Auth } from '../../../../core/services/auth';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { registerCounts } from '../../register-status';
import { CashierHandover } from '../../ui/cashier-handover/cashier-handover';
import { CloseShiftDrawer } from '../../ui/close-shift-drawer/close-shift-drawer';
import { RegisterCard } from '../../ui/register-card/register-card';

/** Mismo ritmo que la cola de despacho: el estado se ve al día sin recargar. */
const REFRESH_MS = 30_000;

/**
 * HU-68, pestaña Cajas del punto de venta: cada caja libre u ocupada, quién tiene el turno y desde
 * cuándo (aunque lo haya abierto otro día). El administrador puede pasar el turno a otro cajero o
 * cerrarlo declarando el efectivo contado.
 */
@Component({
  selector: 'app-register-board',
  imports: [ResourceState, StatCard, RegisterCard, CashierHandover, CloseShiftDrawer],
  templateUrl: './register-board.html',
})
export class RegisterBoard {
  private readonly api = inject(ApiClient);

  protected readonly canManage = inject(Auth).hasAnyRole(['ADMINISTRADOR']);

  protected readonly source = httpResource<RegisterStatus[]>(() => this.api.url(API_ENDPOINTS.turnos.cajas), {
    defaultValue: [],
  });
  protected readonly registers = computed(() => valueOr(this.source, []));
  protected readonly counts = computed(() => registerCounts(this.registers()));

  /** Turno que se está pasando a otro cajero. */
  protected readonly handover = signal<CashShift | null>(null);
  /** Turno que se está cerrando. */
  protected readonly closing = signal<CashShift | null>(null);

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.source.reload(), REFRESH_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected changed(): void {
    this.handover.set(null);
    this.closing.set(null);
    this.source.reload();
  }
}
