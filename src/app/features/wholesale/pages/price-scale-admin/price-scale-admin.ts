import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { asAppError } from '../../../../core/http/as-app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { PriceScale, PriceScaleDraft } from '../../../../core/models/price-scale.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { PriceScaleService } from '../../services/price-scale.service';
import {
  PREVIEW_QUANTITIES,
  QUICK_QUANTITIES,
  baseRangeLabel,
  buildScaleRows,
  previewPrice,
  rangeLabel,
  ScaleRow,
  suggestTier,
  tierBounds,
} from '../../wholesale-utils';
import { valueOr } from '../../../../core/http/resource-value';

/**
 * Precio por cantidad (mayoreo). Los tramos de un producto no pueden traslaparse: el backend
 * rechaza una cantidad mínima repetida o un precio que no baja al subir la cantidad.
 */
@Component({
  selector: 'app-price-scale-admin',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    PageHeader,
    ResourceState,
    StatusChip,
    Icon,
    FormDrawer,
    ConfirmDialog,
    MoneyPipe,
  ],
  templateUrl: './price-scale-admin.html',
})
export class PriceScaleAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly scales = inject(PriceScaleService);
  private readonly notifications = inject(Notifications);
  private readonly route = inject(ActivatedRoute);

  protected readonly crumbs = [{ label: 'Precios' }, { label: 'Mayoreo' }];
  protected readonly rangeLabel = rangeLabel;

  protected readonly products = httpResource<CatalogProduct[]>(
    () => this.api.url(API_ENDPOINTS.productos.root),
    { defaultValue: [] },
  );

  protected readonly productItems = computed(() => valueOr(this.products, []));

  /** Se puede llegar con `?producto=ID` desde la ficha del producto. */
  protected readonly productId = signal<number | null>(this.initialProductId());
  protected readonly product = computed(
    () => this.productItems().find((candidate) => candidate.id === this.productId()) ?? null,
  );

  protected readonly tramos = httpResource<PriceScale[]>(() => {
    const id = this.productId();
    return id === null ? undefined : this.api.url(API_ENDPOINTS.escalasPrecio.byProducto(id));
  }, { defaultValue: [] });

  protected readonly tramoItems = computed(() => valueOr(this.tramos, []));
  protected readonly rows = computed(() => buildScaleRows(this.tramoItems()));
  protected readonly baseLabel = computed(() => baseRangeLabel(this.tramoItems()));
  protected readonly basePrice = computed(() => this.product()?.precio ?? 0);
  protected readonly previews = computed(() =>
    PREVIEW_QUANTITIES.map((quantity) => previewPrice(quantity, this.tramoItems(), this.basePrice())),
  );

  /** Tramo en edición; null = alta. */
  protected readonly editing = signal<PriceScale | null>(null);
  protected readonly drawerOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly confirmingDelete = signal(false);
  protected readonly deleting = signal(false);

  protected readonly deleteMessage = computed(() => {
    const tramo = this.editing();
    if (!tramo) return '';
    const price = new MoneyPipe().transform(tramo.precioUnitario);
    return `Vas a eliminar el tramo desde ${tramo.cantidadMinima} unidades a ${price} c/u de «${tramo.producto}». Esas compras volverán a cobrarse con el tramo anterior o con el precio base.`;
  });

  protected readonly form = this.fb.nonNullable.group({
    cantidadMinima: [1, [Validators.required, Validators.min(1)]],
    precioUnitario: [0, [Validators.required, Validators.min(0.01)]],
    activo: [true],
  });

  protected readonly quickQuantities = QUICK_QUANTITIES;
  private readonly formValue = toSignal(this.form.valueChanges, { initialValue: this.form.getRawValue() });

  /** Los demás tramos del producto (sin el que se edita), para validar y previsualizar. */
  private readonly otherTramos = computed(() => {
    const current = this.editing();
    return this.tramoItems().filter((tramo) => tramo.id !== current?.id);
  });

  /** Entre qué precios tiene que quedar el tramo del formulario. */
  protected readonly bounds = computed(() =>
    tierBounds(Number(this.formValue().cantidadMinima) || 1, this.otherTramos(), this.basePrice()),
  );

  /** "Con este tramo, 12 unidades cuestan $27.60 en lugar de $30.72". */
  protected readonly draftPreview = computed(() => {
    const cantidad = Math.max(1, Math.trunc(Number(this.formValue().cantidadMinima) || 0));
    const precio = Number(this.formValue().precioUnitario) || 0;
    const total = Math.round(cantidad * precio * 100) / 100;
    const antes = Math.round(cantidad * this.bounds().menorQue * 100) / 100;
    return { cantidad, precio, total, antes, ahorro: Math.round((antes - total) * 100) / 100 };
  });

  /** Ejemplo con el producto elegido para explicar qué es un tramo. */
  protected readonly example = computed(() => suggestTier([], this.basePrice()));

  protected setQuantity(cantidad: number): void {
    this.form.controls.cantidadMinima.setValue(cantidad);
    this.form.controls.cantidadMinima.markAsDirty();
  }

  protected selectProduct(value: string): void {
    const id = Number(value);
    this.productId.set(id > 0 ? id : null);
    this.closeDrawer();
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ ...suggestTier(this.tramoItems(), this.basePrice()), activo: true });
    this.drawerOpen.set(true);
  }

  protected openEdit(row: ScaleRow): void {
    const tramo = row.tramo;
    this.editing.set(tramo);
    this.formError.set(null);
    this.form.reset({
      cantidadMinima: tramo.cantidadMinima,
      precioUnitario: tramo.precioUnitario,
      activo: tramo.activo,
    });
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.confirmingDelete.set(false);
    this.editing.set(null);
    this.formError.set(null);
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
        this.closeDrawer();
        this.tramos.reload();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const appError = asAppError(error);
        applyFieldErrors(this.form, appError);
        this.formError.set(formLevelMessage(appError));
      },
    });
  }

  protected askDelete(): void {
    this.confirmingDelete.set(true);
  }

  protected cancelDelete(): void {
    if (!this.deleting()) this.confirmingDelete.set(false);
  }

  protected confirmDelete(): void {
    const tramo = this.editing();
    if (!tramo) return;
    this.deleting.set(true);
    this.scales.remove(tramo.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.notifications.success('Tramo eliminado.');
        this.closeDrawer();
        this.tramos.reload();
      },
      // El errorInterceptor ya avisó del fallo.
      error: () => {
        this.deleting.set(false);
        this.confirmingDelete.set(false);
      },
    });
  }

  private initialProductId(): number | null {
    const id = Number(this.route.snapshot.queryParamMap.get('producto'));
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
