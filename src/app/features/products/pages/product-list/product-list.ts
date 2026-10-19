import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import {
  CatalogProduct,
  ESPECIALIDAD_LABELS,
  ESPECIALIDADES,
  Especialidad,
} from '../../../../core/models/catalog.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import {
  STOCK_CHIPS,
  STOCK_SEGMENTS,
  StockSegment,
  filterProducts,
  productKpis,
  segmentCounts,
  stockPercent,
  stockState,
} from '../../product-view';
import { ProductAdminService } from '../../services/product-admin.service';
import { ProductDrawer } from '../../ui/product-drawer/product-drawer';

@Component({
  selector: 'app-product-list',
  imports: [
    RouterLink,
    MoneyPipe,
    Icon,
    PageHeader,
    ResourceState,
    StatCard,
    StatusChip,
    ProductDrawer,
  ],
  templateUrl: './product-list.html',
})
export class ProductList {
  private readonly service = inject(ProductAdminService);
  private readonly auth = inject(Auth);

  /** Solo administración crea productos. */
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);

  protected readonly crumbs = [{ label: 'Inventario' }, { label: 'Productos' }];
  protected readonly segments = STOCK_SEGMENTS;
  protected readonly chips = STOCK_CHIPS;
  protected readonly especialidades = ESPECIALIDADES.map((value) => ({
    value,
    label: ESPECIALIDAD_LABELS[value],
  }));
  protected readonly especialidadLabels = ESPECIALIDAD_LABELS;

  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  protected readonly all = computed(() => (this.products.hasValue() ? this.products.value() : []));

  protected readonly query = signal('');
  protected readonly segment = signal<StockSegment>('todos');
  protected readonly especialidad = signal<Especialidad | ''>('');
  protected readonly drawerOpen = signal(false);

  protected readonly kpis = computed(() => productKpis(this.all()));
  protected readonly counts = computed(() => segmentCounts(this.all()));
  protected readonly rows = computed(() =>
    filterProducts(this.all(), {
      query: this.query(),
      segment: this.segment(),
      especialidad: this.especialidad(),
    }).map((product) => {
      const state = stockState(product);
      return { product, state, percent: stockPercent(product) };
    }),
  );

  protected setEspecialidad(value: string): void {
    this.especialidad.set(value as Especialidad | '');
  }

  protected onSaved(): void {
    this.drawerOpen.set(false);
    this.products.reload();
  }

  protected barClass(state: ReturnType<typeof stockState>): string {
    switch (state) {
      case 'agotado':
        return 'bg-error';
      case 'reabastecer':
        return 'bg-warning';
      case 'disponible':
        return 'bg-success';
      default:
        return 'bg-base-content/30';
    }
  }
}
