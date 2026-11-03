import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { AppError } from '../../../../core/http/app-error';
import { ApiClient } from '../../../../core/http/api-client';
import { formLevelMessage } from '../../../../core/http/form-errors';
import { valueOr } from '../../../../core/http/resource-value';
import { Id } from '../../../../core/models/api.model';
import { CashShift, CashierOption } from '../../../../core/models/order.model';
import { ROLE_LABELS } from '../../../../core/models/user.model';
import { Notifications } from '../../../../core/services/notifications';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';

/** Lo mínimo del turno que se entrega: alcanza con el turno del servidor o con el del punto de venta. */
export interface HandoverShift {
  readonly id: Id;
  readonly caja: string;
  readonly usuario: string;
}

/**
 * HU-68: cambio de cajero sin cerrar el turno. El turno abierto pasa al que recibe; el servidor
 * registra quién entregó, quién recibió y cuándo. Lo usan el panel de cajas y el cierre del POS.
 */
@Component({
  selector: 'app-cashier-handover',
  imports: [ReactiveFormsModule, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      title="Cambiar cajero"
      [subtitle]="shift() ? shift()!.caja + ' · turno #' + shift()!.id + ' de ' + shift()!.usuario : ''"
      (closed)="closed.emit()"
    >
      @if (formError(); as message) {
        <div role="alert" class="alert alert-error mb-4 py-2 text-sm">{{ message }}</div>
      }
      <p class="mb-4 text-sm text-base-content/70">
        El turno sigue abierto y pasa a quien recibe, con el mismo fondo y las ventas ya hechas. Cada
        venta queda a nombre de quien la cobró, y el cambio queda en la bitácora.
      </p>
      <form id="handover-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="save()">
        <div>
          <label class="mb-1.5 block text-sm font-semibold" for="handover-cajero">Recibe la caja</label>
          @if (cashiers.isLoading() && options().length === 0) {
            <div class="h-10 animate-pulse rounded-field bg-base-200" aria-busy="true"></div>
          } @else if (options().length === 0) {
            <p class="text-sm text-base-content/60">
              No hay otro cajero activo sin turno abierto. Quien vaya a recibir la caja tiene que
              cerrar antes el suyo.
            </p>
          } @else {
            <select
              id="handover-cajero"
              formControlName="nuevoCajeroId"
              class="select select-bordered w-full"
              [class.select-error]="form.controls.nuevoCajeroId.invalid && form.controls.nuevoCajeroId.touched"
            >
              <option [ngValue]="null" disabled>Elegí a quién</option>
              @for (option of options(); track option.id) {
                <option [ngValue]="option.id">{{ option.nombre }} · {{ roleLabel(option.rol) }}</option>
              }
            </select>
            @if (form.controls.nuevoCajeroId.invalid && form.controls.nuevoCajeroId.touched) {
              <p class="mt-1 text-xs text-error">Elegí quién recibe la caja.</p>
            }
          }
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-semibold" for="handover-nota">Nota (opcional)</label>
          <textarea
            id="handover-nota"
            rows="2"
            maxlength="255"
            placeholder="Por ejemplo, cambio de turno de la tarde"
            formControlName="nota"
            class="textarea textarea-bordered w-full"
          ></textarea>
        </div>
      </form>
      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button
          type="submit"
          form="handover-form"
          class="btn btn-primary"
          [disabled]="saving() || options().length === 0"
        >
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Pasar la caja
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class CashierHandover {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder);

  readonly open = input(false);
  readonly shift = input<HandoverShift | null>(null);
  readonly closed = output<void>();
  /** El turno ya es del que recibió. */
  readonly handedOver = output<CashShift>();

  /** Solo se consulta con el panel abierto: la lista cambia cada vez que alguien abre o cierra un turno. */
  protected readonly cashiers = httpResource<CashierOption[]>(
    () => (this.open() ? this.api.url(API_ENDPOINTS.turnos.cajeros) : undefined),
    { defaultValue: [] },
  );
  protected readonly options = computed(() => valueOr(this.cashiers, []));
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    nuevoCajeroId: this.fb.control<number | null>(null, Validators.required),
    nota: this.fb.nonNullable.control('', Validators.maxLength(255)),
  });

  constructor() {
    effect(() => {
      if (!this.open()) return;
      untracked(() => {
        this.formError.set(null);
        this.saving.set(false);
        this.form.reset({ nuevoCajeroId: null, nota: '' });
      });
    });
  }

  protected roleLabel(rol: string): string {
    return ROLE_LABELS[rol as keyof typeof ROLE_LABELS] ?? rol;
  }

  protected save(): void {
    const shift = this.shift();
    if (!shift) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const nota = this.form.controls.nota.value.trim();
    this.saving.set(true);
    this.api
      .post<CashShift>(API_ENDPOINTS.turnos.cambiarCajero(shift.id), {
        nuevoCajeroId: this.form.controls.nuevoCajeroId.value,
        nota: nota || undefined,
      })
      .subscribe({
        next: (turno) => {
          this.saving.set(false);
          this.notifications.success(`${turno.caja} pasó a ${turno.usuario}. El turno sigue abierto.`);
          this.handedOver.emit(turno);
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(formLevelMessage(error) ?? error.message);
          this.cashiers.reload();
        },
      });
  }
}
