import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProductMovement, StockMovement } from '../../../../core/models/inventory.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { valueOr } from '../../../../core/http/resource-value';
import { InventoryService } from '../../../raw-materials/services/inventory.service';
import { AdjustmentDrawer } from '../../../raw-materials/ui/adjustment-drawer';
import { PurchaseDrawer } from '../../../raw-materials/ui/purchase-drawer';
import {
  KARDEX_PERIODS,
  KardexPeriod,
  KardexSegment,
  filterKardex,
  mergeKardex,
} from '../../kardex';

type Drawer = 'purchase' | 'adjustment' | null;

const PAGE_SIZE = 50;

/** Kárdex general: entradas y salidas de insumos y productos. Solo lectura. */
@Component({
  selector: 'app-movements-list',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    MoneyPipe,
    PageHeader,
    ResourceState,
    StatusChip,
    Icon,
    PurchaseDrawer,
    AdjustmentDrawer,
  ],
  templateUrl: './movements-list.html',
})
export class MovementsList {
  private readonly service = inject(InventoryService);

  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly crumbs: readonly Crumb[] = [{ label: 'Inventario' }, { label: 'Movimientos' }];
  protected readonly periods = KARDEX_PERIODS;

  protected readonly query = signal('');
  protected readonly segment = signal<KardexSegment>('todos');
  protected readonly period = signal<KardexPeriod>('todo');
  protected readonly limit = signal(PAGE_SIZE);
  protected readonly drawer = signal<Drawer>(null);

  private readonly materialMovements = httpResource<StockMovement[]>(
    () => this.service.allMovementsUrl('materia-prima'),
    { defaultValue: [] },
  );
  private readonly productMovements = httpResource<ProductMovement[]>(
    () => this.service.allMovementsUrl('producto'),
    { defaultValue: [] },
  );

  protected readonly loading = computed(
    () => this.materialMovements.isLoading() || this.productMovements.isLoading(),
  );
  protected readonly failed = computed(
    () => !!this.materialMovements.error() || !!this.productMovements.error(),
  );

  private readonly all = computed(() =>
    mergeKardex(valueOr(this.materialMovements, []), valueOr(this.productMovements, [])),
  );
  protected readonly total = computed(() => this.all().length);
  private readonly filtered = computed(() =>
    filterKardex(this.all(), {
      query: this.query(),
      segment: this.segment(),
      period: this.period(),
    }),
  );
  protected readonly matching = computed(() => this.filtered().length);
  protected readonly entries = computed(() => this.filtered().slice(0, this.limit()));

  protected readonly segments: readonly { value: KardexSegment; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'entradas', label: 'Entradas' },
    { value: 'salidas', label: 'Salidas' },
  ];

  protected setFilter(change: () => void): void {
    change();
    this.limit.set(PAGE_SIZE);
  }

  protected showMore(): void {
    this.limit.update((limit) => limit + PAGE_SIZE);
  }

  protected reload(): void {
    this.materialMovements.reload();
    this.productMovements.reload();
  }

  protected onSaved(): void {
    this.drawer.set(null);
    this.reload();
  }
}
