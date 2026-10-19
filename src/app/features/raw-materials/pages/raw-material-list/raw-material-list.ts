import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { RawMaterialStock, StockMovement } from '../../../../core/models/inventory.model';
import { RawMaterial } from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import {
  MATERIAL_STATUS_CHIP,
  MaterialSegment,
  buildMaterialRows,
  filterMaterialRows,
  latestCostByMaterial,
} from '../../raw-material-calc';
import { valueOr } from '../../../../core/http/resource-value';
import { InventoryService } from '../../services/inventory.service';
import { MaterialFormDrawer } from '../../ui/material-form-drawer';
import { PurchaseDrawer } from '../../ui/purchase-drawer';

type Drawer = 'create' | 'purchase' | null;

/** Lista de materia prima: existencia, mínimo y costo promedio. Cada fila abre su ficha. */
@Component({
  selector: 'app-raw-material-list',
  imports: [
    RouterLink,
    DecimalPipe,
    MoneyPipe,
    PageHeader,
    ResourceState,
    StatCard,
    StatusChip,
    Icon,
    MaterialFormDrawer,
    PurchaseDrawer,
  ],
  templateUrl: './raw-material-list.html',
})
export class RawMaterialList {
  private readonly service = inject(InventoryService);
  private readonly router = inject(Router);

  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly crumbs: readonly Crumb[] = [{ label: 'Inventario' }, { label: 'Materia prima' }];
  protected readonly chips = MATERIAL_STATUS_CHIP;

  protected readonly query = signal('');
  protected readonly segment = signal<MaterialSegment>('todos');
  protected readonly drawer = signal<Drawer>(null);

  private readonly materials = httpResource<RawMaterial[]>(() => this.service.materialsUrl(), {
    defaultValue: [],
  });
  private readonly stocks = httpResource<RawMaterialStock[]>(
    () => this.service.stockUrl('materia-prima'),
    { defaultValue: [] },
  );
  /** Todos los movimientos: de ahí sale el costo promedio vigente de cada insumo. */
  private readonly movements = httpResource<StockMovement[]>(
    () => this.service.allMovementsUrl('materia-prima'),
    { defaultValue: [] },
  );

  protected readonly loading = computed(
    () => this.materials.isLoading() || this.stocks.isLoading() || this.movements.isLoading(),
  );
  protected readonly failed = computed(
    () => !!this.materials.error() || !!this.stocks.error() || !!this.movements.error(),
  );

  private readonly allRows = computed(() =>
    buildMaterialRows(
      valueOr(this.materials, []),
      valueOr(this.stocks, []),
      latestCostByMaterial(valueOr(this.movements, [])),
    ).sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  protected readonly rows = computed(() =>
    filterMaterialRows(this.allRows(), this.query(), this.segment()),
  );
  protected readonly total = computed(() => this.allRows().length);
  protected readonly lowCount = computed(() => this.allRows().filter((row) => row.bajoMinimo).length);

  protected readonly segments = computed(
    () =>
      [
        { value: 'todos', label: 'Todos', count: this.total() },
        { value: 'bajo', label: 'Bajo mínimo', count: this.lowCount() },
      ] as const,
  );

  protected reload(): void {
    this.materials.reload();
    this.stocks.reload();
    this.movements.reload();
  }

  protected onCreated(material: RawMaterial): void {
    this.drawer.set(null);
    void this.router.navigate(['/backoffice/raw-materials', material.id]);
  }

  protected onPurchased(): void {
    this.drawer.set(null);
    this.reload();
  }
}
