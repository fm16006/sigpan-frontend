import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import {
  CLOSED_PRODUCTION_STATUSES,
  Formula,
  PRODUCTION_STATUS_LABELS,
  Production,
} from '../../../../core/models/production.model';
import { Notifications } from '../../../../core/services/notifications';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductionService } from '../../services/production.service';

@Component({
  selector: 'app-production-list',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, DatePipe, DecimalPipe],
  templateUrl: './production-list.html',
})
export class ProductionList {
  private readonly service = inject(ProductionService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly statusLabels = PRODUCTION_STATUS_LABELS;

  protected readonly productions = httpResource<Production[]>(() => this.service.listUrl(), {
    defaultValue: [],
  });
  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  protected readonly formulas = httpResource<Formula[]>(() => this.service.formulasUrl(), {
    defaultValue: [],
  });

  protected readonly items = computed(() =>
    [...this.productions.value()].sort((a, b) => b.id - a.id),
  );

  protected readonly form = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    formulaId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
    comentario: [''],
  });

  private readonly productId = toSignal(this.form.controls.productoId.valueChanges, {
    initialValue: 0,
  });
  private readonly formulaId = toSignal(this.form.controls.formulaId.valueChanges, {
    initialValue: 0,
  });
  private readonly batches = toSignal(this.form.controls.cantidad.valueChanges, {
    initialValue: 1,
  });

  protected readonly productFormulas = computed(() =>
    this.formulas.value().filter((formula) => formula.productoId === Number(this.productId())),
  );
  protected readonly expectedUnits = computed(() => {
    const formula = this.formulas.value().find((item) => item.id === Number(this.formulaId()));
    return formula ? Number(formula.cantidadProduccion) * Number(this.batches() || 0) : null;
  });

  protected readonly showForm = signal(false);
  protected readonly saving = signal(false);
  protected readonly busyId = signal<Id | null>(null);
  protected readonly confirmFinishId = signal<Id | null>(null);

  constructor() {
    this.form.controls.productoId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((productoId) => {
        const options = this.formulas
          .value()
          .filter((formula) => formula.productoId === Number(productoId));
        this.form.controls.formulaId.setValue(options.length === 1 ? options[0].id : 0);
      });
  }

  protected errorFor(field: string): string | null {
    const control = this.form.get(field);
    if (control?.hasError('min') && control.touched) {
      if (field === 'productoId') return 'Elegí un producto.';
      if (field === 'formulaId') return 'Elegí una receta.';
      return 'Debe ser al menos 1.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected isClosed(production: Production): boolean {
    return CLOSED_PRODUCTION_STATUSES.includes(production.estado);
  }

  protected toggleForm(): void {
    this.form.reset();
    this.showForm.update((open) => !open);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    this.service.create({ ...value, comentario: value.comentario.trim() }).subscribe({
      next: (production) => {
        this.saving.set(false);
        this.showForm.set(false);
        this.form.reset();
        this.notifications.success(`Producción de "${production.producto}" registrada.`);
        this.productions.reload();
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
      },
    });
  }

  protected finish(production: Production): void {
    if (this.confirmFinishId() !== production.id) {
      this.confirmFinishId.set(production.id);
      return;
    }

    this.confirmFinishId.set(null);
    this.busyId.set(production.id);
    this.service.changeStatus(production.id, 'TERMINADO').subscribe({
      next: () => {
        this.busyId.set(null);
        this.notifications.success(
          `Producción de "${production.producto}" terminada. El inventario se actualizó.`,
        );
        this.productions.reload();
      },
      error: () => this.busyId.set(null),
    });
  }
}
