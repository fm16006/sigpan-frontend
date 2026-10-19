import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import {
  Formula,
  PRODUCTION_STATUS_LABELS,
  Production,
} from '../../../../core/models/production.model';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderFormDrawer, OrderPrefill } from '../../components/order-form-drawer/order-form-drawer';
import {
  ORDER_SEGMENTS,
  OrderSegment,
  matchesOrderSearch,
  matchesSegment,
  orderCode,
  orderUnits,
  progressSteps,
  segmentOf,
  stepClass,
} from '../../production-summary';
import { ProductionService } from '../../services/production.service';

interface OrderRow {
  readonly production: Production;
  readonly code: string;
  readonly units: number | null;
  readonly steps: ReturnType<typeof progressSteps>;
}

@Component({
  selector: 'app-production-list',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    PageHeader,
    ResourceState,
    StatusChip,
    Icon,
    OrderFormDrawer,
  ],
  templateUrl: './production-list.html',
})
export class ProductionList {
  private readonly service = inject(ProductionService);
  private readonly router = inject(Router);

  /**
   * Query params opcionales (se enlazan solos): `?productoId=3&cantidad=2` abre "Nueva orden"
   * prellenada con ese producto y esos lotes (así enlaza la pestaña Receta del producto).
   */
  readonly productoId = input<string>();
  readonly cantidad = input<string>();

  protected readonly crumbs = [{ label: 'Producción' }, { label: 'Órdenes' }];
  protected readonly statusLabels = PRODUCTION_STATUS_LABELS;
  protected readonly segments = ORDER_SEGMENTS;
  protected readonly code = orderCode;
  protected readonly stepClass = stepClass;

  protected readonly productions = httpResource<Production[]>(() => this.service.listUrl(), {
    defaultValue: [],
  });
  private readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  private readonly formulas = httpResource<Formula[]>(() => this.service.formulasUrl(), {
    defaultValue: [],
  });

  // value() lanza si el recurso está en error: se lee solo cuando hay valor.
  private readonly orderItems = computed(() =>
    this.productions.hasValue() ? this.productions.value() : [],
  );
  protected readonly productItems = computed(() =>
    this.products.hasValue() ? this.products.value() : [],
  );
  protected readonly formulaItems = computed(() =>
    this.formulas.hasValue() ? this.formulas.value() : [],
  );

  protected readonly search = signal('');
  protected readonly segment = signal<OrderSegment>('activas');
  protected readonly drawerOpen = signal(false);
  protected readonly prefill = signal<OrderPrefill | null>(null);

  protected readonly loading = computed(
    () => this.productions.isLoading() || this.formulas.isLoading(),
  );

  private readonly rows = computed<readonly OrderRow[]>(() => {
    const formulas = this.formulaItems();
    return [...this.orderItems()]
      .sort((a, b) => b.id - a.id)
      .map((production) => ({
        production,
        code: orderCode(production.id),
        units: orderUnits(production, formulas),
        steps: progressSteps(production.estado),
      }));
  });

  protected readonly counts = computed(() => {
    const items = this.orderItems();
    return {
      activas: items.filter((item) => segmentOf(item.estado) === 'activas').length,
      terminadas: items.filter((item) => segmentOf(item.estado) === 'terminadas').length,
      canceladas: items.filter((item) => segmentOf(item.estado) === 'canceladas').length,
      todas: items.length,
    } satisfies Record<OrderSegment, number>;
  });

  protected readonly visible = computed(() => {
    const segment = this.segment();
    const term = this.search();
    return this.rows().filter(
      (row) => matchesSegment(row.production.estado, segment) && matchesOrderSearch(row.production, term),
    );
  });

  constructor() {
    effect(() => {
      const productoId = Number(this.productoId());
      const lotes = Number(this.cantidad());
      if (!(productoId > 0)) {
        return;
      }
      untracked(() => {
        this.prefill.set({ productoId, lotes: lotes > 0 ? lotes : 1 });
        this.drawerOpen.set(true);
      });
    });
  }

  protected openNew(): void {
    this.prefill.set(null);
    this.drawerOpen.set(true);
  }

  protected onSaved(production: Production): void {
    this.drawerOpen.set(false);
    void this.router.navigate(['/backoffice/production', production.id]);
  }
}
