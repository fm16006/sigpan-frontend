import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../../core/http/form-errors';
import { Combo, ComboDraft } from '../../../../core/models/combo.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { comboSaving } from '../../combo-summary';
import { ComboService } from '../../services/combo.service';

/**
 * Drawer para crear y editar un combo. El backend exige que el precio sea menor que la suma de
 * los precios de sus productos; aquí se explica y se muestra la suma en vivo.
 */
@Component({
  selector: 'app-combo-form-drawer',
  imports: [ReactiveFormsModule, FormDrawer, StatusChip, MoneyPipe],
  templateUrl: './combo-form-drawer.html',
})
export class ComboFormDrawer {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly combos = inject(ComboService);
  private readonly notifications = inject(Notifications);

  readonly open = input(false);
  /** Combo a editar; null = alta. */
  readonly combo = input<Combo | null>(null);
  /** Suma por separado de los productos que ya tiene el combo. */
  readonly sum = input(0);
  /** Cantidad de líneas que ya tiene el combo. */
  readonly lineCount = input(0);

  readonly closed = output<void>();
  readonly saved = output<Combo>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
  });

  private readonly price = toSignal(this.form.controls.precio.valueChanges, { initialValue: 0 });

  protected readonly isEdit = computed(() => this.combo() !== null);
  protected readonly hasProducts = computed(() => this.lineCount() > 0);
  protected readonly saveAmount = computed(() => comboSaving(this.sum(), Number(this.price() || 0)));
  /** El precio es válido para el backend si queda por debajo de la suma (o si aún no hay productos). */
  protected readonly priceValid = computed(
    () => !this.hasProducts() || Number(this.price() || 0) < this.sum(),
  );

  constructor() {
    // Cada vez que el drawer se abre, el formulario arranca con los datos del combo (o en blanco).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const combo = this.combo();
      untracked(() => {
        this.formError.set(null);
        this.form.reset({
          nombre: combo?.nombre ?? '',
          descripcion: combo?.descripcion ?? '',
          precio: combo?.precio ?? 0,
        });
      });
    });
  }

  protected fieldError(field: 'nombre' | 'descripcion' | 'precio'): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const draft: ComboDraft = {
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() || null,
      precio: Number(raw.precio),
    };
    const current = this.combo();

    this.saving.set(true);
    const request = current ? this.combos.update(current.id, draft) : this.combos.create(draft);
    request.subscribe({
      next: (combo) => {
        this.saving.set(false);
        this.notifications.success(
          current ? `Combo "${combo.nombre}" actualizado.` : `Combo "${combo.nombre}" creado.`,
        );
        this.saved.emit(combo);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        this.formError.set(formLevelMessage(error));
      },
    });
  }
}
