import { DecimalPipe } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ItemPurchase } from '../../../../../core/models/purchase.model';
import { MoneyPipe } from '../../../../../shared/pipes/money.pipe';
import { EmptyState } from '../../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { StatCard } from '../../../../../shared/ui/stat-card/stat-card';
import { documentLabel, roundMoney, shortDate } from '../../../../purchases/purchase-calc';
import { ProductContext } from '../product-context';

/** Pestaña Compras de un producto de reventa: de quién se compra y a qué costo. */
@Component({
  selector: 'app-product-purchases',
  imports: [RouterLink, DecimalPipe, MoneyPipe, Icon, StatCard, EmptyState],
  template: `
    @if (ctx.resale()) {
      <div class="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <app-stat-card
          label="Costo promedio"
          [value]="ctx.costoUnitario() !== null ? (ctx.costoUnitario() | money) : '—'"
          hint="Promedio ponderado de las compras"
        />
        <app-stat-card
          label="Precio de venta"
          [value]="ctx.product()?.precio | money"
          [hint]="ctx.margen() !== null ? 'Margen de ' + ctx.margen() + ' %' : 'Sin margen todavía'"
        />
        <app-stat-card label="Existencia" [value]="(ctx.product()?.disponible ?? 0) + ' u'" />
        <app-stat-card label="Últimas compras" [value]="ctx.purchases().length" [hint]="lastHint()" />
      </div>

      <section class="overflow-hidden rounded-box border border-base-300 bg-base-100" aria-labelledby="h-compras">
        <div class="px-5 py-4">
          <h2 id="h-compras" class="font-serif text-lg font-semibold">Compras a proveedores</h2>
          <p class="text-xs text-base-content/60">
            Las últimas diez. La existencia sube con cada compra; una venta la baja.
          </p>
        </div>

        @if (ctx.purchasesRes.isLoading() && !ctx.purchasesRes.hasValue()) {
          <div class="grid gap-2 px-5 pb-5" aria-busy="true">
            @for (n of [1, 2, 3]; track n) {
              <div class="h-12 animate-pulse rounded-lg bg-base-200"></div>
            }
          </div>
        } @else if (ctx.purchasesRes.error()) {
          <div role="alert" class="alert alert-error mx-5 mb-5">
            <span>No pudimos cargar las compras.</span>
            <button type="button" class="btn btn-sm" (click)="ctx.purchasesRes.reload()">Reintentar</button>
          </div>
        } @else if (ctx.purchases().length === 0) {
          <div class="px-5 pb-5">
            <app-empty-state
              title="Sin compras"
              description="Registrá la primera compra para dar entrada a este producto."
            />
          </div>
        } @else {
          <div
            class="grid items-center gap-x-4 border-t border-base-300 px-5 py-3 max-md:hidden md:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1fr)_6rem_6rem_6rem_1rem]"
          >
            <span class="list-th">Fecha</span>
            <span class="list-th">Proveedor</span>
            <span class="list-th">Documento</span>
            <span class="list-th text-right">Cantidad</span>
            <span class="list-th text-right">Costo unit.</span>
            <span class="list-th text-right">Subtotal</span>
            <span></span>
          </div>
          @for (item of ctx.purchases(); track item.compraId + '-' + $index) {
            <a
              class="list-row grid-cols-2 gap-y-1 md:grid-cols-[7rem_minmax(0,1.4fr)_minmax(0,1fr)_6rem_6rem_6rem_1rem]"
              [routerLink]="['/backoffice/purchases', item.compraId]"
              [attr.aria-label]="'Abrir la compra ' + label(item)"
            >
              <span class="text-sm text-base-content/75">{{ date(item.fecha) }}</span>
              <span class="min-w-0 truncate font-semibold">{{ item.proveedor }}</span>
              <span class="min-w-0 truncate text-sm">{{ label(item) }}</span>
              <span class="tabular-nums md:text-right">+{{ item.cantidad | number: '1.0-3' }}</span>
              <span class="tabular-nums md:text-right">{{ item.costoUnitario | money }}</span>
              <span class="font-semibold tabular-nums md:text-right">{{ item.subtotal | money }}</span>
              <app-icon name="chevron" class="text-base-content/40 max-md:hidden" />
            </a>
          }
        }
      </section>
    }
  `,
})
export class ProductPurchases {
  protected readonly ctx = inject(ProductContext);
  protected readonly date = shortDate;

  protected readonly lastHint = computed(() => {
    const total = this.ctx.purchases().reduce((sum, item) => sum + Number(item.subtotal), 0);
    return total > 0 ? 'Suman ' + new Intl.NumberFormat('es-SV', { style: 'currency', currency: 'USD' }).format(roundMoney(total)) : 'Sin compras todavía';
  });

  protected label(item: ItemPurchase): string {
    return documentLabel(item.tipoDocumento, item.numeroDocumento);
  }
}
