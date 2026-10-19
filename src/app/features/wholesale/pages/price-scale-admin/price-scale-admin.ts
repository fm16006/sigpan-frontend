import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { AppError, toAppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { PriceScale, PriceScaleDraft } from '../../../../core/models/price-scale.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { PriceScaleService } from '../../services/price-scale.service';

/**
 * Precio por cantidad (mayoreo). Los tramos de un producto no pueden traslaparse: el backend
 * rechaza una cantidad mínima repetida o un precio que no baja al subir la cantidad.
 */
@Component({
  selector: 'app-price-scale-admin',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, MoneyPipe],
  templateUrl: './price-scale-admin.html',
})
export class PriceScaleAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly scales = inject(PriceScaleService);
  private readonly notifications = inject(Notifications);

  protected readonly products = httpResource<CatalogProduct[]>(
    () => this.api.url(API_ENDPOINTS.productos.root),
    { defaultValue: [] },
  );

  protected readonly productId = signal<number | null>(null);
  protected readonly tramos = httpResource<PriceScale[]>(() => {
    const id = this.productId();
    return id === null ? undefined : this.api.url(API_ENDPOINTS.escalasPrecio.byProducto(id));
  }, { defaultValue: [] });

  /** Tramo en edición; null = alta. */
  protected readonly editing = signal<PriceScale | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    cantidadMinima: [1, [Validators.required, Validators.min(1)]],
    precioUnitario: [0, [Validators.required, Validators.min(0.01)]],
    activo: [true],
  });

  protected selectProduct(value: string): void {
    const id = Number(value);
    this.productId.set(id > 0 ? id : null);
    this.cancelEdit();
  }

  protected startEdit(tramo: PriceScale): void {
    this.editing.set(tramo);
    this.formError.set(null);
    this.form.reset({
      cantidadMinima: tramo.cantidadMinima,
      precioUnitario: tramo.precioUnitario,
      activo: tramo.activo,
    });
  }

  protected cancelEdit(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ cantidadMinima: 1, precioUnitario: 0, activo: true });
  }

  protected fieldError(field: 'cantidadMinima' | 'precioUnitario'): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    const productoId = this.productId();
    this.formError.set(null);
    if (productoId === null) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const draft: PriceScaleDraft = {
      productoId,
      cantidadMinima: Number(raw.cantidadMinima),
      precioUnitario: Number(raw.precioUnitario),
      activo: raw.activo,
    };
    const current = this.editing();

    this.saving.set(true);
    const request = current ? this.scales.update(current.id, draft) : this.scales.create(draft);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(current ? 'Tramo actualizado.' : 'Tramo creado.');
        this.cancelEdit();
        this.tramos.reload();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const appError: AppError = toAppError(error as HttpErrorResponse);
        applyFieldErrors(this.form, appError);
        this.formError.set(formLevelMessage(appError));
      },
    });
  }

  protected remove(tramo: PriceScale): void {
    this.scales.remove(tramo.id).subscribe({
      next: () => {
        this.notifications.success('Tramo eliminado.');
        if (this.editing()?.id === tramo.id) this.cancelEdit();
        this.tramos.reload();
      },
      error: (error: unknown) => {
        this.notifications.error(toAppError(error as HttpErrorResponse).message);
      },
    });
  }
}
