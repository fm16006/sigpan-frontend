import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { hasInventory } from '../../../../core/models/inventory.model';
import { ItemPurchase } from '../../../../core/models/purchase.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { documentLabel } from '../../../purchases/purchase-calc';
import { Icon } from '../../../../shared/ui/icon/icon';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { CONSUMPTION_DAYS, MaterialDetailStore } from './material-detail.store';

/** Pestaña Resumen: números clave, recetas donde se usa y últimas compras. */
@Component({
  selector: 'app-material-summary',
  imports: [RouterLink, DatePipe, DecimalPipe, MoneyPipe, Icon, StatCard],
  template: `
    @if (store.row(); as row) {
      <div class="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <app-stat-card
          label="Existencia"
          [value]="!hasInventory(row) ? '—' : (row.cantidad | number: '1.0-3') + ' ' + row.unidad"
          [hint]="
            !hasInventory(row)
              ? 'Sin inventario habilitado'
              : row.consolidado
                ? 'Suma de todas las sucursales'
                : 'En ' + store.scope.label()
          "
        />
        <app-stat-card label="Mínimo" [value]="(row.minimo | number: '1.0-3') + ' ' + row.unidad" />
        <app-stat-card
          label="Costo promedio"
          [value]="row.costoPromedio === null ? '—' : (row.costoPromedio | money) + ' / ' + row.unidad"
          hint="Promedio ponderado de las compras"
        />
        <app-stat-card
          [label]="'Consumo · ' + days + ' días'"
          [value]="(store.consumed() | number: '1.0-3') + ' ' + row.unidad"
          [hint]="supplyHint()"
        />
      </div>

      <div class="mt-5 grid items-start gap-5 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <section class="panel" aria-labelledby="mp-recetas">
          <div class="flex flex-col gap-0.5">
            <h2 id="mp-recetas" class="font-serif text-base font-semibold sm:text-lg">Usada en estas recetas</h2>
            <p class="text-xs text-base-content/60">
              Un cambio de costo en este insumo recalcula el costo de estos productos.
            </p>
          </div>

          @if (!store.canSeeRecipes) {
            <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/65">
              Las recetas las consultan administración y jefatura de producción.
            </p>
          } @else if (store.usageLoading()) {
            <div class="h-24 animate-pulse rounded-box bg-base-200" aria-busy="true"></div>
          } @else if (store.usageFailed()) {
            <div role="alert" class="alert alert-error text-sm">
              <span>No pudimos cargar las recetas.</span>
              <button type="button" class="btn btn-sm" (click)="store.reload()">Reintentar</button>
            </div>
          } @else if (store.usageRows().length === 0) {
            <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/65">
              Ninguna receta usa este insumo todavía.
            </p>
          } @else {
            <div class="-mx-4 sm:-mx-[1.375rem] overflow-hidden">
              <div
                class="list-row max-md:hidden border-t-0! py-2! grid-cols-[minmax(0,1fr)_7rem_7rem_1rem]"
                aria-hidden="true"
              >
                <span class="list-th">Producto · receta</span>
                <span class="list-th text-end">Por lote</span>
                <span class="list-th text-end">Costo en lote</span>
                <span></span>
              </div>
              @for (usage of store.usageRows(); track usage.id) {
                @if (usage.productoId !== null) {
                  <a
                    class="list-row grid-cols-[minmax(0,1fr)_7rem_7rem_1rem] max-md:grid-cols-[minmax(0,1fr)_auto_1rem] max-md:gap-y-1"
                    [routerLink]="['/backoffice/products', usage.productoId, 'receta']"
                    [attr.aria-label]="'Abrir la receta de ' + usage.producto"
                  >
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate font-semibold">{{ usage.producto }}</span>
                      <span class="truncate text-xs text-base-content/60">{{ usage.receta }}</span>
                    </span>
                    <span class="text-end tabular-nums">
                      {{ usage.cantidad | number: '1.0-3' }} {{ usage.unidad }}
                    </span>
                    <span class="text-end tabular-nums max-md:hidden">
                      {{ usage.costoLote === null ? '—' : (usage.costoLote | money) }}
                    </span>
                    <app-icon name="chevron" class="text-base-content/40" />
                  </a>
                } @else {
                  <div class="list-row grid-cols-[minmax(0,1fr)_7rem_7rem_1rem] max-md:grid-cols-[minmax(0,1fr)_auto]">
                    <span class="truncate font-semibold">{{ usage.producto }}</span>
                    <span class="text-end tabular-nums">
                      {{ usage.cantidad | number: '1.0-3' }} {{ usage.unidad }}
                    </span>
                    <span class="text-end tabular-nums max-md:hidden">
                      {{ usage.costoLote === null ? '—' : (usage.costoLote | money) }}
                    </span>
                    <span></span>
                  </div>
                }
              }
            </div>
          }
        </section>

        <section class="panel" aria-labelledby="mp-compras">
          <div class="flex items-baseline justify-between gap-3">
            <h2 id="mp-compras" class="font-serif text-base font-semibold sm:text-lg">Últimas compras</h2>
            <a
              class="text-sm font-semibold text-primary hover:underline"
              [routerLink]="['/backoffice/raw-materials', store.id(), 'movimientos']"
              >Ver movimientos →</a
            >
          </div>
          @if (store.purchases.isLoading() && !store.purchases.hasValue()) {
            <div class="h-24 animate-pulse rounded-box bg-base-200" aria-busy="true"></div>
          } @else if (!!store.purchases.error()) {
            <div role="alert" class="alert alert-error text-sm">
              <span>No pudimos cargar las compras.</span>
              <button type="button" class="btn btn-sm" (click)="store.purchases.reload()">Reintentar</button>
            </div>
          } @else if (store.purchaseList().length === 0) {
            <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/65">
              Todavía no hay compras a proveedores registradas para este insumo.
            </p>
          } @else {
            <ul class="-mx-4 sm:-mx-[1.375rem] -mb-4 sm:-mb-5 overflow-hidden">
              @for (item of store.purchaseList(); track item.compraId + '-' + $index) {
                <li>
                  <a
                    class="list-row grid-cols-[minmax(0,1fr)_auto_1rem] gap-y-0.5"
                    [routerLink]="['/backoffice/purchases', item.compraId]"
                    [attr.aria-label]="'Abrir la compra ' + label(item)"
                  >
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate text-sm font-medium">{{ item.proveedor }}</span>
                      <span class="text-xs text-base-content/60">
                        {{ label(item) }} · {{ item.fecha | date: 'd MMM y' }}
                      </span>
                    </span>
                    <span class="flex flex-col items-end text-sm tabular-nums">
                      <span class="font-semibold text-success">
                        +{{ item.cantidad | number: '1.0-3' }} {{ row.unidad }}
                      </span>
                      <span class="text-xs text-base-content/60">
                        {{ item.costoUnitario | money }} / {{ row.unidad }}
                      </span>
                    </span>
                    <app-icon name="chevron" class="text-base-content/40" />
                  </a>
                </li>
              }
            </ul>
          }
        </section>
      </div>
    }
  `,
})
export class MaterialSummary {
  protected readonly store = inject(MaterialDetailStore);
  protected readonly hasInventory = hasInventory;
  protected readonly days = CONSUMPTION_DAYS;

  protected label(item: ItemPurchase): string {
    return documentLabel(item.tipoDocumento, item.numeroDocumento);
  }

  protected supplyHint(): string {
    const supply = this.store.supplyDays();
    if (supply === null) return 'Sin salidas en el período';
    if (supply === 0) return 'Alcanza para menos de un día';
    return `Alcanza para unos ${supply} ${supply === 1 ? 'día' : 'días'}`;
  }
}
