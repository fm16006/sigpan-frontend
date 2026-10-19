import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { RawMaterialStock } from '../../../../core/models/inventory.model';
import { RawMaterial } from '../../../../core/models/production.model';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { MATERIAL_STATUS_CHIP, levelOf } from '../../../raw-materials/raw-material-calc';
import { InventoryService } from '../../../raw-materials/services/inventory.service';
import { STOCK_CHIPS, stockState } from '../../../products/product-view';
import { BranchDetailStore } from './branch-detail.store';

/** Pestaña Inventario: lo que hay en esta sucursal, de materia prima y de producto. */
@Component({
  selector: 'app-branch-inventory',
  imports: [RouterLink, DecimalPipe, StatusChip],
  template: `
    <section class="panel" aria-labelledby="suc-mp">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div class="flex flex-col gap-0.5">
          <h2 id="suc-mp" class="font-serif text-lg font-semibold">Materia prima</h2>
          <p class="text-xs text-base-content/60">
            Existencia en esta sucursal frente al mínimo de cada insumo. El total del negocio es la suma de
            todas las sucursales.
          </p>
        </div>
        <a routerLink="/backoffice/transfers" [queryParams]="{ nuevo: 1 }" class="btn btn-sm">
          Nuevo traslado
        </a>
      </div>

      @if (materialsLoading() && materialRows().length === 0) {
        <div class="h-24 animate-pulse rounded-box bg-base-200" aria-busy="true"></div>
      } @else if (failed()) {
        <div role="alert" class="alert alert-error text-sm">
          <span>No pudimos cargar el inventario de la sucursal.</span>
          <button type="button" class="btn btn-sm" (click)="reload()">Reintentar</button>
        </div>
      } @else if (materialRows().length === 0) {
        <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/65">
          Todavía no hay materias primas registradas.
        </p>
      } @else {
        <div class="overflow-hidden rounded-box border border-base-300">
          <div
            class="list-row max-md:hidden border-t-0! py-3! grid-cols-[minmax(0,2fr)_8rem_8rem_8rem]"
            aria-hidden="true"
          >
            <span class="list-th">Insumo</span>
            <span class="list-th text-end">Existencia</span>
            <span class="list-th text-end">Mínimo</span>
            <span class="list-th">Estado</span>
          </div>
          @for (row of materialRows(); track row.id) {
            <a
              class="list-row grid-cols-[minmax(0,2fr)_8rem_8rem_8rem] max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1"
              [routerLink]="['/backoffice/raw-materials', row.id]"
              [attr.aria-label]="'Abrir ficha de ' + row.nombre"
            >
              <span class="truncate font-semibold">{{ row.nombre }}</span>
              <span class="text-end font-semibold tabular-nums max-md:order-last max-md:col-start-1 max-md:text-start">
                {{ row.cantidad | number: '1.0-3' }} {{ row.unidad }}
              </span>
              <span class="text-end tabular-nums text-base-content/65 max-md:hidden">
                {{ row.minimo | number: '1.0-3' }}
              </span>
              <app-status-chip [label]="chip(row.nivel).label" [tone]="chip(row.nivel).tone" />
            </a>
          }
        </div>
      }
    </section>

    <section class="panel mt-5" aria-labelledby="suc-prod">
      <div class="flex flex-col gap-0.5">
        <h2 id="suc-prod" class="font-serif text-lg font-semibold">Productos</h2>
        <p class="text-xs text-base-content/60">Unidades disponibles en esta sucursal.</p>
      </div>

      @if (productsLoading() && productRows().length === 0) {
        <div class="h-24 animate-pulse rounded-box bg-base-200" aria-busy="true"></div>
      } @else if (productRows().length === 0) {
        <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/65">
          Todavía no hay productos registrados.
        </p>
      } @else {
        <div class="overflow-hidden rounded-box border border-base-300">
          <div
            class="list-row max-md:hidden border-t-0! py-3! grid-cols-[minmax(0,2fr)_8rem_8rem_8rem]"
            aria-hidden="true"
          >
            <span class="list-th">Producto</span>
            <span class="list-th text-end">Disponible</span>
            <span class="list-th text-end">Mínimo</span>
            <span class="list-th">Estado</span>
          </div>
          @for (row of productRows(); track row.id) {
            <div
              class="list-row grid-cols-[minmax(0,2fr)_8rem_8rem_8rem] max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1"
            >
              <span class="flex min-w-0 flex-col">
                <span class="truncate font-semibold">{{ row.nombre }}</span>
                <span class="font-mono text-xs text-base-content/60">{{ row.codigo }}</span>
              </span>
              <span class="text-end font-semibold tabular-nums max-md:order-last max-md:col-start-1 max-md:text-start">
                {{ row.disponible | number: '1.0-0' }}
              </span>
              <span class="text-end tabular-nums text-base-content/65 max-md:hidden">
                {{ row.minimo | number: '1.0-0' }}
              </span>
              <app-status-chip [label]="stockChips[row.estado].label" [tone]="stockChips[row.estado].tone" />
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class BranchInventory {
  protected readonly store = inject(BranchDetailStore);
  private readonly inventory = inject(InventoryService);

  protected readonly stockChips = STOCK_CHIPS;

  private readonly materials = httpResource<RawMaterial[]>(() => this.inventory.materialsUrl(), {
    defaultValue: [],
  });
  private readonly materialStock = httpResource<RawMaterialStock[]>(
    () => this.inventory.stockUrl('materia-prima', { sucursalId: this.store.id() }),
    { defaultValue: [] },
  );
  private readonly products = httpResource<CatalogProduct[]>(
    () => this.inventory.productsUrl({ sucursalId: this.store.id() }),
    { defaultValue: [] },
  );

  protected readonly materialsLoading = computed(
    () => this.materials.isLoading() || this.materialStock.isLoading(),
  );
  protected readonly productsLoading = computed(() => this.products.isLoading());
  protected readonly failed = computed(() => !!this.materials.error() || !!this.materialStock.error());

  protected readonly materialRows = computed(() => {
    const stock = new Map(valueOr(this.materialStock, []).map((item) => [item.materiaPrimaId, item]));
    return valueOr(this.materials, [])
      .filter((material) => material.activo !== false)
      .map((material) => {
        const cantidad = Number(stock.get(material.id)?.cantidad ?? 0);
        const minimo = Number(material.stockMinimo ?? 0);
        return {
          id: material.id,
          nombre: material.nombre,
          unidad: material.unidadMedida,
          cantidad,
          minimo,
          nivel: levelOf(cantidad, minimo),
        };
      })
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  });

  protected readonly productRows = computed(() =>
    valueOr(this.products, [])
      .filter((product) => product.activo)
      .map((product) => ({
        id: product.id,
        nombre: product.nombre,
        codigo: product.codigo,
        disponible: Number(product.disponible ?? 0),
        minimo: Number(product.stockMinimo ?? 0),
        estado: stockState(product),
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );

  protected chip(level: 'agotada' | 'bajo' | 'suficiente') {
    return MATERIAL_STATUS_CHIP[level];
  }

  protected reload(): void {
    this.materials.reload();
    this.materialStock.reload();
    this.products.reload();
  }
}
