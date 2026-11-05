import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Combo, ComboLine } from '../../../../core/models/combo.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { ComboService } from '../../services/combo.service';

/**
 * Drawer para agregar un producto a un combo. Como el backend valida el precio con cada línea
 * que se agrega, aquí se muestra la suma que resultaría y se avisa antes de intentarlo.
 */
@Component({
  selector: 'app-combo-line-drawer',
  imports: [ReactiveFormsModule, FormDrawer, StatusChip, MoneyPipe],
  templateUrl: './combo-line-drawer.html',
})
export class ComboLineDrawer {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly combos = inject(ComboService);
  private readonly notifications = inject(Notifications);

  readonly open = input(false);
  readonly combo = input.required<Combo>();
  readonly lines = input<readonly ComboLine[]>([]);
  readonly products = input<readonly CatalogProduct[]>([]);
  /** Suma por separado de los productos que ya están en el combo. */
  readonly sum = input(0);

  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    productoId: [0, [Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  private readonly productId = toSignal(this.form.controls.productoId.valueChanges, { initialValue: 0 });
  private readonly quantity = toSignal(this.form.controls.cantidad.valueChanges, { initialValue: 1 });

  /** Productos que todavía no están en el combo (el backend rechaza duplicados). */
  protected readonly available = computed(() => {
    const used = new Set(this.lines().map((line) => line.productoId));
    return this.products().filter((product) => !used.has(product.id));
  });

  protected readonly selected = computed(() =>
    this.products().find((product) => product.id === Number(this.productId())),
  );

  protected readonly lineSubtotal = computed(() => {
    const product = this.selected();
    return product ? Number(product.precio) * Number(this.quantity() || 0) : 0;
  });

  /** Suma del combo si se agrega esta línea. */
  protected readonly newSum = computed(() => this.sum() + this.lineSubtotal());

  /** Con el producto elegido el precio del combo deja de ser menor que la suma: el backend lo rechaza. */
  protected readonly priceTooHigh = computed(
    () => this.selected() !== undefined && this.combo().precio >= this.newSum(),
  );

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      untracked(() => {
        this.formError.set(null);
        this.form.reset({ productoId: 0, cantidad: 1 });
      });
    });
  }

  protected save(): void {
    this.formError.set(null);
    if (this.form.invalid || this.form.controls.productoId.value < 1) {
      this.form.markAllAsTouched();
      this.formError.set('Elegí un producto y una cantidad.');
      return;
    }

    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.combos
      .addLine({
        comboId: this.combo().id,
        productoId: Number(raw.productoId),
        cantidad: Number(raw.cantidad),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success('Producto agregado al combo.');
          this.saved.emit();
        },
        // Si el precio deja de ser menor que la suma, el backend revierte la línea y explica por qué.
        error: (error: AppError) => {
          this.saving.set(false);
          this.formError.set(error.message);
        },
      });
  }
}
