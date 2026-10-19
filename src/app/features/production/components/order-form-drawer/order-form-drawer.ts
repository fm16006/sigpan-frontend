import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Formula, MaterialExplosion, Production } from '../../../../core/models/production.model';
import { BranchScope } from '../../../../core/services/branch-scope';
import { Notifications } from '../../../../core/services/notifications';
import { debouncedSignal } from '../../../../core/utils/debounced-signal';
import { notBeforeToday, todayIso } from '../../../../core/utils/dates';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { ProductionService } from '../../services/production.service';
import { ExplosionTable } from '../explosion-table/explosion-table';

export interface OrderPrefill {
  readonly productoId: number;
  readonly lotes: number;
}

/**
 * Drawer de "Nueva orden": producto, receta (se elige sola si hay una), lotes, fecha y comentario,
 * con la explosión de materiales en vivo para saber si alcanzan los insumos antes de crearla.
 */
@Component({
  selector: 'app-order-form-drawer',
  imports: [ReactiveFormsModule, DecimalPipe, FormDrawer, ExplosionTable],
  templateUrl: './order-form-drawer.html',
})
export class OrderFormDrawer {
  private readonly service = inject(ProductionService);
  protected readonly scope = inject(BranchScope);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  readonly products = input<readonly CatalogProduct[]>([]);
  readonly formulas = input<readonly Formula[]>([]);
  /** Producto y lotes con los que arranca el formulario (por ejemplo, desde la receta). */
  readonly prefill = input<OrderPrefill | null>(null);

  readonly closed = output<void>();
  readonly saved = output<Production>();

  /** Mínimo del selector de fecha planificada. */
  protected readonly today = todayIso();
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    formulaId: [0, [Validators.required, Validators.min(1)]],
    sucursalId: [0],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    fechaPlanificada: [todayIso(), [Validators.required, notBeforeToday]],
    comentario: [''],
  });

  private readonly productId = toSignal(this.form.controls.productoId.valueChanges, { initialValue: 0 });
  private readonly formulaId = toSignal(this.form.controls.formulaId.valueChanges, { initialValue: 0 });
  private readonly branchId = toSignal(this.form.controls.sucursalId.valueChanges, { initialValue: 0 });
  private readonly batches = toSignal(this.form.controls.cantidad.valueChanges, { initialValue: 1 });

  /** Solo los productos que tienen al menos una receta pueden producirse. */
  protected readonly producible = computed(() => {
    const withRecipe = new Set(this.formulas().map((formula) => formula.productoId));
    return this.products().filter((product) => withRecipe.has(product.id));
  });

  protected readonly productFormulas = computed(() =>
    this.formulas().filter((formula) => formula.productoId === Number(this.productId())),
  );

  protected readonly formula = computed(() =>
    this.formulas().find((item) => item.id === Number(this.formulaId())),
  );

  /** Unidades que saldrán: lotes × lo que rinde la receta. */
  protected readonly units = computed(() => {
    const formula = this.formula();
    return formula ? Number(formula.cantidadProduccion) * Number(this.batches() || 0) : 0;
  });

  private readonly queryUnits = debouncedSignal(this.units, 300);

  protected readonly explosion = httpResource<MaterialExplosion>(() => {
    const units = this.queryUnits();
    return this.open() && Number(this.productId()) > 0 && this.formula() && units > 0
      ? this.service.explosionUrl(Number(this.productId()), units, Number(this.branchId()) || null)
      : undefined;
  });

  protected readonly explosionMessage = computed<string | null>(() => {
    const error = this.explosion.error() as AppError | undefined;
    if (!error) {
      return null;
    }
    return error.kind === 'notFound'
      ? 'El producto no tiene una receta activa. Registrá su receta primero.'
      : error.message;
  });

  constructor() {
    // Al elegir producto, la receta se completa sola cuando es la única.
    this.form.controls.productoId.valueChanges.pipe(takeUntilDestroyed()).subscribe((productoId) => {
      const options = this.formulas().filter((formula) => formula.productoId === Number(productoId));
      this.form.controls.formulaId.setValue(options.length === 1 ? options[0].id : 0);
    });

    // Si las recetas llegan después de abrir (enlace con producto prellenado), se completa la receta.
    effect(() => {
      const formulas = this.formulas();
      if (!this.open()) {
        return;
      }
      untracked(() => {
        const productoId = Number(this.form.controls.productoId.value);
        if (productoId > 0 && Number(this.form.controls.formulaId.value) === 0) {
          const options = formulas.filter((formula) => formula.productoId === productoId);
          if (options.length === 1) {
            this.form.controls.formulaId.setValue(options[0].id);
          }
        }
      });
    });

    // Cada apertura arranca con el formulario en blanco (o prellenado) y la fecha en hoy.
    effect(() => {
      if (!this.open()) {
        return;
      }
      const prefill = this.prefill();
      untracked(() => {
        this.formError.set(null);
        this.form.reset({
          productoId: 0,
          formulaId: 0,
          sucursalId: this.scope.branchId() ?? this.scope.ownBranchId() ?? 0,
          cantidad: prefill?.lotes ?? 1,
          fechaPlanificada: todayIso(),
          comentario: '',
        });
        if (prefill) {
          this.form.controls.productoId.setValue(prefill.productoId);
        }
      });
    });
  }

  protected errorFor(field: string): string | null {
    const control = this.form.get(field);
    if (control?.hasError('min') && control.touched) {
      if (field === 'productoId') return 'Elegí un producto.';
      if (field === 'formulaId') return 'Elegí una receta.';
      return 'Debe ser al menos 1.';
    }
    if (field === 'fechaPlanificada' && control?.hasError('minDate')) {
      return 'La fecha planificada no puede ser anterior a hoy.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    this.service
      .create({
        productoId: Number(value.productoId),
        formulaId: Number(value.formulaId),
        ...(Number(value.sucursalId) > 0 ? { sucursalId: Number(value.sucursalId) } : {}),
        cantidad: Number(value.cantidad),
        fechaPlanificada: value.fechaPlanificada,
        comentario: value.comentario.trim(),
      })
      .subscribe({
        next: (production) => {
          this.saving.set(false);
          this.notifications.success(`Orden de "${production.producto}" registrada.`);
          this.saved.emit(production);
        },
        error: (error: AppError) => {
          this.saving.set(false);
          applyFieldErrors(this.form, error);
          this.formError.set(formLevelMessage(error));
        },
      });
  }
}
