import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { DOCUMENT_TYPE_LABELS, Purchase, PurchaseLine } from '../../../../core/models/purchase.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { DetailHeader } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { documentLabel, shortDate } from '../../purchase-calc';
import { PurchaseService } from '../../services/purchase.service';

/** Detalle de una compra: proveedor, documento y las líneas con cantidad, costo y subtotal. */
@Component({
  selector: 'app-purchase-detail',
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet, MoneyPipe, DetailHeader, ResourceState, StatCard, Icon],
  template: `
    <app-resource-state
      [loading]="purchaseRes.isLoading() && !current()"
      [failed]="!!purchaseRes.error() && !current()"
      (retry)="purchaseRes.reload()"
    >
      @if (current(); as p) {
        <app-detail-header [crumbs]="crumbs()" [title]="label()" [code]="'Compra #' + p.id">
          <div chips class="contents">
            <span class="rounded-md bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/80">
              {{ typeLabels[p.tipoDocumento] }}
            </span>
          </div>
          <div actions class="contents">
            <a [routerLink]="['/backoffice/suppliers', p.proveedorId]" class="btn">Ver proveedor</a>
          </div>
        </app-detail-header>

        <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <app-stat-card label="Proveedor" [value]="p.proveedor" />
          <app-stat-card
            label="Fecha del documento"
            [value]="date(p.fecha)"
            [hint]="p.sucursal ? 'Recibió ' + p.sucursal : undefined"
          />
          <app-stat-card
            label="Líneas"
            [value]="p.totalLineas"
            [hint]="(units() | number: '1.0-3') + ' unidades en total'"
          />
          <app-stat-card label="Total" [value]="p.total | money" />
        </div>

        <section class="panel" aria-labelledby="h-lineas">
          <div>
            <h2 id="h-lineas" class="font-serif text-base font-semibold sm:text-lg">Líneas de la compra</h2>
            <p class="text-xs text-base-content/55">
              Cada línea sumó su cantidad a la existencia y entró al costo promedio del artículo.
            </p>
          </div>

          <div class="-mx-4 sm:-mx-[1.375rem] -mb-4 sm:-mb-5 overflow-hidden border-t border-base-300">
            <div
              class="grid items-center gap-x-4 px-5 py-3 max-md:hidden md:grid-cols-[minmax(0,1.6fr)_7rem_6rem_6.5rem_1rem]"
            >
              <span class="list-th">Artículo</span>
              <span class="list-th text-right">Cantidad</span>
              <span class="list-th text-right">Costo unit.</span>
              <span class="list-th text-right">Subtotal</span>
              <span></span>
            </div>

            @for (line of p.lineas; track line.id) {
              @if (link(line); as target) {
                <a
                  class="list-row grid-cols-2 gap-y-1 md:grid-cols-[minmax(0,1.6fr)_7rem_6rem_6.5rem_1rem]"
                  [routerLink]="target"
                  [attr.aria-label]="'Abrir la ficha de ' + line.item"
                >
                  <ng-container *ngTemplateOutlet="row; context: { $implicit: line }" />
                  <app-icon name="chevron" class="text-base-content/40 max-md:hidden" />
                </a>
              } @else {
                <div class="list-row grid-cols-2 gap-y-1 md:grid-cols-[minmax(0,1.6fr)_7rem_6rem_6.5rem_1rem]">
                  <ng-container *ngTemplateOutlet="row; context: { $implicit: line }" />
                  <span class="max-md:hidden"></span>
                </div>
              }
            }

            <div
              class="grid grid-cols-[1fr_auto] items-center gap-x-4 border-t border-base-300 bg-base-200/50 px-5 py-3 text-sm md:pe-[3.5rem]"
            >
              <span class="font-semibold">Total</span>
              <span class="font-semibold tabular-nums">{{ p.total | money }}</span>
            </div>
          </div>
        </section>

        <ng-template #row let-line>
          <span class="flex min-w-0 flex-col">
            <span class="truncate font-semibold">{{ line.item }}</span>
            <span class="text-xs text-base-content/60">
              {{ line.materiaPrimaId ? 'Materia prima' : 'Producto de reventa' }}
            </span>
          </span>
          <span class="tabular-nums md:text-right">
            {{ line.cantidad | number: '1.0-3' }} {{ line.unidad }}
          </span>
          <span class="tabular-nums md:text-right">
            <span class="text-xs text-base-content/55 md:hidden">Costo </span>{{ line.costoUnitario | money }}
          </span>
          <span class="font-semibold tabular-nums md:text-right">{{ line.subtotal | money }}</span>
        </ng-template>
      }
    </app-resource-state>
  `,
})
export class PurchaseDetail {
  private readonly service = inject(PurchaseService);
  private readonly auth = inject(Auth);

  /** Parámetro `:id` de la ruta. */
  readonly id = input.required<string>();

  protected readonly typeLabels = DOCUMENT_TYPE_LABELS;
  protected readonly date = shortDate;
  /** Las fichas de producto son de administración y jefe de producción. */
  private readonly canOpenProducts = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);

  protected readonly purchaseRes = httpResource<Purchase>(() =>
    this.service.purchaseUrl(Number(this.id())),
  );
  protected readonly current = computed(() => valueOr<Purchase | undefined>(this.purchaseRes, undefined));
  protected readonly label = computed(() => {
    const purchase = this.current();
    return purchase ? documentLabel(purchase.tipoDocumento, purchase.numeroDocumento) : '';
  });
  protected readonly units = computed(() =>
    (this.current()?.lineas ?? []).reduce((sum, line) => sum + Number(line.cantidad), 0),
  );

  protected readonly crumbs = computed<readonly Crumb[]>(() => [
    { label: 'Inventario' },
    { label: 'Compras', link: '/backoffice/purchases' },
    { label: this.label() },
  ]);

  /** Ficha del insumo o del producto; null si el rol no puede abrirla. */
  protected link(line: PurchaseLine): string[] | null {
    if (line.materiaPrimaId !== null) {
      return ['/backoffice/raw-materials', String(line.materiaPrimaId)];
    }
    return line.productoId !== null && this.canOpenProducts
      ? ['/backoffice/products', String(line.productoId)]
      : null;
  }
}
