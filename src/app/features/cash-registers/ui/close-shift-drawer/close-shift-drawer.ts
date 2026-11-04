import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { AppError } from '../../../../core/http/app-error';
import { ApiClient } from '../../../../core/http/api-client';
import { formLevelMessage } from '../../../../core/http/form-errors';
import { CashShift } from '../../../../core/models/order.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { cashDifference } from '../../register-status';

/**
 * HU-68: el administrador cierra el turno abierto de otro cajero declarando el efectivo contado.
 * El servidor guarda quién lo cerró y lo anota en la bitácora.
 */
@Component({
  selector: 'app-close-shift-drawer',
  imports: [ReactiveFormsModule, FormDrawer, MoneyPipe],
  template: `
    <app-form-drawer
      [open]="!!shift()"
      title="Cerrar turno"
      [subtitle]="shift() ? 'Turno #' + shift()!.id + ' de ' + shift()!.usuario + ' en ' + shift()!.caja : ''"
      (closed)="closed.emit()"
    >
      @if (shift(); as current) {
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error mb-4 py-2 text-sm">{{ message }}</div>
        }
        <p class="mb-4 text-sm text-base-content/70">
          Contá el efectivo de la gaveta. El cierre queda a tu nombre y en la bitácora, con la
          diferencia contra lo esperado.
        </p>
        <form id="close-shift-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="save()">
          <div class="flex items-center justify-between rounded-box bg-base-200 px-4 py-3">
            <span class="text-sm">Efectivo esperado</span>
            <span class="font-semibold tabular-nums">{{ current.efectivoEsperado | money }}</span>
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="close-contado">Efectivo contado</label>
            <input
              id="close-contado"
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              formControlName="contado"
              class="input input-bordered w-full tabular-nums"
              [class.input-error]="form.controls.contado.invalid && form.controls.contado.touched"
            />
            @if (form.controls.contado.invalid && form.controls.contado.touched) {
              <p class="mt-1 text-xs text-error">Ingresá un monto de cero o más.</p>
            }
          </div>
          <p class="text-sm" aria-live="polite">
            Diferencia:
            <span
              class="font-semibold tabular-nums"
              [class.text-error]="difference() < 0"
              [class.text-success]="difference() > 0"
            >
              {{ difference() | money }}
            </span>
            {{ difference() < 0 ? '(faltante)' : difference() > 0 ? '(sobrante)' : '(cuadra)' }}
          </p>
          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="close-observacion">
              Observación (opcional)
            </label>
            <textarea
              id="close-observacion"
              rows="3"
              maxlength="255"
              placeholder="Por ejemplo, por qué lo cerró la administración"
              formControlName="observacion"
              class="textarea textarea-bordered w-full"
            ></textarea>
          </div>
        </form>
      }
      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="close-shift-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Cerrar turno
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class CloseShiftDrawer {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  /** Turno a cerrar; null = panel cerrado. */
  readonly shift = input<CashShift | null>(null);
  readonly closed = output<void>();
  readonly done = output<CashShift>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly form = this.fb.group({
    contado: [0, [Validators.required, Validators.min(0), Validators.max(99_999_999)]],
    observacion: ['', [Validators.maxLength(255)]],
  });
  private readonly counted = toSignal(this.form.controls.contado.valueChanges, { initialValue: 0 });
  protected readonly difference = computed(() => {
    const shift = this.shift();
    return shift ? cashDifference(Number(this.counted() ?? 0), Number(shift.efectivoEsperado)) : 0;
  });

  constructor() {
    // Cada vez que se abre parte del efectivo esperado: lo normal es que cuadre.
    effect(() => {
      const shift = this.shift();
      if (!shift) return;
      untracked(() => {
        this.formError.set(null);
        this.saving.set(false);
        this.form.reset({ contado: Number(shift.efectivoEsperado), observacion: '' });
      });
    });
  }

  protected save(): void {
    const shift = this.shift();
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
        next: (closedShift) => {
          this.saving.set(false);
          this.notifications.success(
            `Turno #${closedShift.id} de ${closedShift.usuario} cerrado en ${closedShift.caja}.`,
          );
          this.done.emit(closedShift);
        },
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(formLevelMessage(error) ?? error.message);
        },
      });
  }
}
