import { DecimalPipe, NgTemplateOutlet } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { Transfer, TransferLine } from '../../../../core/models/transfer.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { DetailHeader } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { TransferService } from '../../services/transfer.service';
import { shortDate } from '../../transfer-calc';

/** Detalle de un traslado: de dónde a dónde, quién lo registró y las líneas con su cantidad y costo. */
@Component({
  selector: 'app-transfer-detail',
  imports: [RouterLink, DecimalPipe, NgTemplateOutlet, MoneyPipe, DetailHeader, ResourceState, StatCard, Icon],
  template: `
    <app-resource-state
      [loading]="transferRes.isLoading() && !current()"
      [failed]="!!transferRes.error() && !current()"
      (retry)="transferRes.reload()"
    >
      @if (current(); as t) {
        <app-detail-header [crumbs]="crumbs()" [title]="t.documento" [code]="'Traslado #' + t.id">
          <div chips class="contents">
            <span class="rounded-md bg-base-200 px-2 py-0.5 text-xs font-medium text-base-content/80">
              {{ t.sucursalOrigen }} → {{ t.sucursalDestino }}
            </span>
          </div>
          <div actions class="contents">
            <a routerLink="/backoffice/movements" class="btn">Ver movimientos</a>
          </div>
        </app-detail-header>

        <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <app-stat-card label="Origen" [value]="t.sucursalOrigen" hint="Salida de inventario" />
          <app-stat-card label="Destino" [value]="t.sucursalDestino" hint="Entrada de inventario" />
          <app-stat-card label="Fecha" [value]="date(t.fecha)" [hint]="'Registró ' + (t.usuario ?? '—')" />
          <app-stat-card
            label="Líneas"
            [value]="t.totalLineas"
            [hint]="'Valor ' + (total() | money) + ' al costo del origen'"
          />
        </div>

        @if (t.nota) {
          <p class="mb-6 rounded-box border border-base-300 bg-base-100 px-5 py-3 text-sm">
            <span class="text-xs text-base-content/60">Nota</span><br />
            {{ t.nota }}
          </p>
        }

        <section class="panel" aria-labelledby="h-lineas">
          <div>
            <h2 id="h-lineas" class="font-serif text-lg font-semibold">Líneas del traslado</h2>
            <p class="text-xs text-base-content/55">
              Cada línea restó su cantidad al origen y la sumó al destino con el mismo costo promedio. El
              documento {{ t.documento }} aparece en el kárdex de las dos sucursales.
            </p>
          </div>

          <div class="-mx-[1.375rem] -mb-5 overflow-hidden border-t border-base-300">
            <div
              class="grid items-center gap-x-4 px-5 py-3 max-md:hidden md:grid-cols-[minmax(0,1.6fr)_7rem_6rem_6.5rem_1rem]"
            >
              <span class="list-th">Artículo</span>
              <span class="list-th text-right">Cantidad</span>
              <span class="list-th text-right">Costo unit.</span>
              <span class="list-th text-right">Valor</span>
              <span></span>
            </div>

            @for (line of t.lineas; track line.id) {
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
              <span class="font-semibold">Valor total</span>
              <span class="font-semibold tabular-nums">{{ total() | money }}</span>
            </div>
          </div>
        </section>

        <ng-template #row let-line>
          <span class="flex min-w-0 flex-col">
            <span class="truncate font-semibold">{{ line.item }}</span>
            <span class="text-xs text-base-content/60">
              {{ line.tipo === 'MATERIA_PRIMA' ? 'Materia prima' : 'Producto' }}
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
export class TransferDetail {
  private readonly service = inject(TransferService);
  private readonly auth = inject(Auth);

  /** Parámetro `:id` de la ruta. */
  readonly id = input.required<string>();

  protected readonly date = shortDate;
  /** Las fichas de producto son de administración y jefe de producción. */
  private readonly canOpenProducts = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);

  protected readonly transferRes = httpResource<Transfer>(() =>
    this.service.transferUrl(Number(this.id())),
  );
  protected readonly current = computed(() => valueOr<Transfer | undefined>(this.transferRes, undefined));
  protected readonly total = computed(() =>
    (this.current()?.lineas ?? []).reduce((sum, line) => sum + Number(line.subtotal), 0),
  );

  protected readonly crumbs = computed<readonly Crumb[]>(() => [
    { label: 'Inventario' },
    { label: 'Traslados', link: '/backoffice/transfers' },
    { label: this.current()?.documento ?? '' },
  ]);

  /** Ficha del insumo o del producto; null si el rol no puede abrirla. */
  protected link(line: TransferLine): string[] | null {
    if (line.materiaPrimaId !== null) {
      return ['/backoffice/raw-materials', String(line.materiaPrimaId)];
    }
    return line.productoId !== null && this.canOpenProducts
      ? ['/backoffice/products', String(line.productoId)]
      : null;
  }
}
