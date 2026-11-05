import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Liquidation, LiquidationDraft } from '../../../../core/models/liquidation.model';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { ProductService } from '../../../storefront/services/product.service';

const EMPTY: LiquidationDraft = {
  productoId: null,
  umbral: 0,
  horaInicio: '17:00',
  horaFin: '20:00',
  porcentaje: 30,
  prioridad: 0,
  activo: true,
};

/** HU-28: liquidación de lo que sobra al final del día. */
@Component({
  selector: 'app-liquidation-list',
  imports: [FormsModule, PageHeader, ResourceState, StatusChip, ConfirmDialog],
  templateUrl: './liquidation-list.html',
})
export class LiquidationList {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);
  private readonly productService = inject(ProductService);

  protected readonly crumbs = [{ label: 'Precios' }, { label: 'Liquidaciones' }];
  protected readonly list = httpResource<Liquidation[]>(() => this.api.url(API_ENDPOINTS.liquidaciones.root), {
    defaultValue: [],
  });
  protected readonly items = computed(() => valueOr(this.list, []));
  protected readonly products = httpResource<CatalogProduct[]>(() => this.productService.activePosUrl(), {
    defaultValue: [],
  });
  protected readonly productItems = computed(() => valueOr(this.products, []));

  protected readonly editingId = signal<number | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly removing = signal<Liquidation | null>(null);
  protected draft: LiquidationDraft = { ...EMPTY };

  protected create(): void {
    this.draft = { ...EMPTY };
    this.editingId.set(null);
    this.formOpen.set(true);
  }

  protected edit(item: Liquidation): void {
    const { productoId, umbral, horaInicio, horaFin, porcentaje, prioridad, activo } = item;
    this.draft = { productoId, umbral, horaInicio, horaFin, porcentaje: Number(porcentaje), prioridad, activo };
    this.editingId.set(Number(item.id));
    this.formOpen.set(true);
  }

  protected save(): void {
    if (this.draft.productoId == null) {
      this.notifications.error('Elegí un producto.');
      return;
    }
    const id = this.editingId();
    const request =
      id === null
        ? this.api.post<Liquidation>(API_ENDPOINTS.liquidaciones.root, this.draft)
        : this.api.put<Liquidation>(API_ENDPOINTS.liquidaciones.byId(id), this.draft);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.formOpen.set(false);
        this.notifications.success('Liquidación guardada.');
        this.list.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  protected confirmRemove(): void {
    const item = this.removing();
    this.removing.set(null);
    if (!item) return;
    this.api.delete<void>(API_ENDPOINTS.liquidaciones.byId(item.id)).subscribe(() => {
      this.notifications.success('Liquidación desactivada.');
      this.list.reload();
    });
  }
}
