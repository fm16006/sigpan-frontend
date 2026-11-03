import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { AppError } from '../../../../core/http/app-error';
import { ApiClient } from '../../../../core/http/api-client';
import { formLevelMessage } from '../../../../core/http/form-errors';
import { valueOr } from '../../../../core/http/resource-value';
import { CashShift, RegisterStatus } from '../../../../core/models/order.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { cashDifference, occupiedSince, registerCounts } from '../../register-status';
import { CashierHandover } from '../../ui/cashier-handover/cashier-handover';

/** Mismo ritmo que la cola de despacho: el estado se ve al día sin recargar. */
const REFRESH_MS = 30_000;

/**
 * HU-68: estado de las cajas desde el panel. Muestra cada caja libre u ocupada, quién tiene el
 * turno y desde cuándo (aunque lo haya abierto otro día), y deja al administrador cerrar el turno
 * de otro cajero declarando el efectivo contado.
 */
@Component({
  selector: 'app-register-board',
  imports: [
    ReactiveFormsModule,
    DatePipe,
    PageHeader,
    ResourceState,
    StatCard,
    StatusChip,
    FormDrawer,
    MoneyPipe,
    CashierHandover,
  ],
  templateUrl: './register-board.html',
})
export class RegisterBoard {
  private readonly api = inject(ApiClient);
  private readonly auth = inject(Auth);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly crumbs = [{ label: 'Ventas' }, { label: 'Cajas' }];
  protected readonly canClose = this.auth.hasAnyRole(['ADMINISTRADOR']);

  protected readonly source = httpResource<RegisterStatus[]>(() => this.api.url(API_ENDPOINTS.turnos.cajas), {
    defaultValue: [],
  });
  protected readonly registers = computed(() => valueOr(this.source, []));
  protected readonly counts = computed(() => registerCounts(this.registers()));

  /** Turno que se está pasando a otro cajero. */
  protected readonly handover = signal<CashShift | null>(null);

  /** Turno que se está cerrando desde el panel lateral. */
  protected readonly closing = signal<CashShift | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    contado: [0, [Validators.required, Validators.min(0), Validators.max(99_999_999)]],
    observacion: ['', [Validators.maxLength(255)]],
  });
  private readonly counted = toSignal(this.form.controls.contado.valueChanges, { initialValue: 0 });
  protected readonly difference = computed(() => {
    const shift = this.closing();
    return shift ? cashDifference(Number(this.counted() ?? 0), Number(shift.efectivoEsperado)) : 0;
  });

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.source.reload(), REFRESH_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected sinceOf(status: RegisterStatus): { label: string; stale: boolean } | null {
    return status.apertura ? occupiedSince(status.apertura) : null;
  }

  protected askClose(shift: CashShift): void {
    this.formError.set(null);
    this.saving.set(false);
    this.form.reset({ contado: Number(shift.efectivoEsperado), observacion: '' });
    this.closing.set(shift);
  }

  protected dismissClose(): void {
    this.closing.set(null);
  }

  protected confirmClose(): void {
    const shift = this.closing();
    if (!shift) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const observacion = this.form.controls.observacion.value.trim();
    this.saving.set(true);
    this.api
      .post<CashShift>(API_ENDPOINTS.turnos.cerrar(shift.id), {
        efectivoContado: this.form.controls.contado.value,
        observacion: observacion || undefined,
      })
      .subscribe({
        next: (closed) => {
          this.saving.set(false);
          this.closing.set(null);
          this.notifications.success(`Turno #${closed.id} de ${closed.usuario} cerrado en ${closed.caja}.`);
          this.source.reload();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(formLevelMessage(error) ?? error.message);
          this.source.reload();
        },
      });
  }
}
