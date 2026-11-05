import { DatePipe, DecimalPipe } from '@angular/common';
import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { ORDER_STATUS_LABELS, Sale } from '../../../../core/models/order.model';
import { Quote, ruleLabel } from '../../../../core/models/quote.model';
import { MaterialAvailability } from '../../../../core/models/stock-control.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';

/** HU-52: consultas rápidas del mostrador sin salir del punto de venta. */
@Component({
  selector: 'app-pos-consultas',
  imports: [DatePipe, DecimalPipe, FormsModule, MoneyPipe],
  host: { class: 'grid min-h-0 flex-1 content-start gap-4 overflow-y-auto lg:grid-cols-2' },
  template: `
    <section class="rounded-box border border-base-300 bg-base-100 p-4">
      <h2 class="mb-2 font-semibold">Producto: existencia y precio</h2>
      <div class="flex gap-2">
        <input class="input input-sm flex-1" placeholder="Buscar producto" [ngModel]="productQuery()" (ngModelChange)="productQuery.set($event)" />
        <input class="input input-sm w-20" type="number" min="1" aria-label="Cantidad" [ngModel]="qty()" (ngModelChange)="qty.set(+$event || 1)" />
      </div>
      <ul class="mt-2 max-h-48 overflow-y-auto">
        @for (p of productMatches(); track p.id) {
          <li>
            <button type="button" class="flex w-full justify-between rounded px-2 py-1 text-sm hover:bg-base-200" [class.bg-base-200]="productId() === p.id" (click)="productId.set(p.id)">
              <span>{{ p.nombre }}</span>
              <span class="tabular-nums" [class.text-error]="p.agotado">{{ p.agotado ? 'Agotado' : (p.disponible ?? 0) + ' u' }}</span>
            </button>
          </li>
        }
      </ul>
      @if (quoteValue(); as q) {
        <div class="mt-3 rounded bg-base-200 p-3 text-sm">
          <p>{{ qty() }} u: <strong>{{ q.total | money }}</strong>
            @if (q.ahorro > 0) { <span class="text-success">· ahorra {{ q.ahorro | money }}</span> }
          </p>
          @if (q.reglaAplicada) { <p class="text-xs text-base-content/60">Regla: {{ ruleLabel(q.reglaAplicada) }}</p> }
          @for (s of q.sugerencias ?? []; track s.regla) { <p class="text-xs text-success">{{ s.mensaje }}</p> }
        </div>
      }
    </section>

    <section class="rounded-box border border-base-300 bg-base-100 p-4">
      <h2 class="mb-2 font-semibold">Estado de un pedido</h2>
      <form class="flex gap-2" (submit)="$event.preventDefault(); orderId.set(orderInput)">
        <input class="input input-sm flex-1" type="number" min="1" placeholder="N.º de pedido o venta" name="orden" [(ngModel)]="orderInput" />
        <button class="btn btn-sm">Consultar</button>
      </form>
      @if (order.error()) {
        <p class="mt-2 text-sm text-error">No encontramos ese número.</p>
      }
      @if (orderValue(); as o) {
        <div class="mt-3 text-sm">
          <p><strong>#{{ o.id }}</strong> · {{ channelLabel(o.tipo) }} · {{ statusLabel(o.estado) }}
            @if (o.encargo) { <span class="badge badge-info badge-sm">encargo</span> }
          </p>
          <p class="text-base-content/60">{{ o.fecha | date: 'd MMM y, HH:mm' }} · {{ o.total | money }}</p>
          @if (o.fechaProgramada) { <p>Programado: {{ o.fechaProgramada | date: 'd MMM, HH:mm' }}</p> }
          @if (o.motivoAnulacion) { <p class="text-error">Anulada: {{ o.motivoAnulacion }}</p> }
          <ul class="mt-2 text-xs text-base-content/70">
            @for (h of o.historial ?? []; track h.id) {
              <li>{{ h.fecha | date: 'd MMM, HH:mm' }} · {{ statusLabel(h.estado) }}</li>
            }
          </ul>
        </div>
      }
    </section>

    <section class="rounded-box border border-base-300 bg-base-100 p-4">
      <h2 class="mb-2 font-semibold">Insumo: existencia y vencimiento</h2>
      <input class="input input-sm w-full" placeholder="Buscar insumo" [ngModel]="materialQuery()" (ngModelChange)="materialQuery.set($event)" />
      <ul class="mt-2 max-h-56 divide-y divide-base-300 overflow-y-auto text-sm">
        @for (m of materials(); track m.materiaPrimaId) {
          <li class="flex justify-between py-1.5">
            <span>{{ m.materiaPrima }}</span>
            <span class="text-end tabular-nums">
              {{ m.existencia | number: '1.0-3' }} {{ m.unidad }}
              @if (m.proximoVencimiento) { <br /><span class="text-xs text-warning">vence {{ m.proximoVencimiento | date: 'd MMM' }}</span> }
            </span>
          </li>
        }
      </ul>
    </section>

    <section class="rounded-box border border-base-300 bg-base-100 p-4">
      <h2 class="mb-2 font-semibold">Compras de un cliente</h2>
      <form class="flex gap-2" (submit)="$event.preventDefault(); clientEmail.set(clientInput.trim())">
        <input class="input input-sm flex-1" type="email" placeholder="Correo del cliente" name="correo" [(ngModel)]="clientInput" />
        <button class="btn btn-sm">Buscar</button>
      </form>
      @if (history.error()) {
        <p class="mt-2 text-sm text-error">No hay un cliente con ese correo.</p>
      }
      <ul class="mt-2 max-h-56 divide-y divide-base-300 overflow-y-auto text-sm">
        @for (v of historyItems(); track v.id) {
          <li class="flex justify-between py-1.5">
            <span>#{{ v.id }} · {{ v.fecha | date: 'd MMM y' }} · {{ statusLabel(v.estado) }}</span>
            <span class="tabular-nums">{{ v.total | money }}</span>
          </li>
        } @empty {
          @if (clientEmail()) { <li class="py-2 text-base-content/60">Sin compras.</li> }
        }
      </ul>
    </section>
  `,
})
export class PosConsultas {
  private readonly api = inject(ApiClient);
  /** «Promoción #1», no la regla cruda «PROMOCION:1». */
  protected readonly ruleLabel = ruleLabel;

  private readonly products = httpResource<CatalogProduct[]>(
    () => this.api.url(API_ENDPOINTS.productos.activos, { canal: 'POS' }),
    { defaultValue: [] },
  );
  protected readonly productQuery = signal('');
  protected readonly productId = signal<number | null>(null);
  protected readonly qty = signal(1);
  protected readonly productMatches = computed(() => {
    const q = fold(this.productQuery());
    return q ? valueOr(this.products, []).filter((p) => fold(p.nombre).includes(q)).slice(0, 8) : [];
  });
  private readonly quote = httpResource<Quote>((): HttpResourceRequest | undefined => {
    const id = this.productId();
    return id ? { url: this.api.url(API_ENDPOINTS.orders.quote), method: 'POST', body: { lineas: [{ productoId: id, cantidad: this.qty() }] } } : undefined;
  });
  protected readonly quoteValue = computed(() => valueOr(this.quote, undefined));

  protected orderInput: number | null = null;
  protected readonly orderId = signal<number | null>(null);
  protected readonly order = httpResource<Sale>(() => {
    const id = this.orderId();
    return id ? this.api.url(API_ENDPOINTS.orders.consulta(id)) : undefined;
  });
  protected readonly orderValue = computed(() => valueOr(this.order, undefined));

  protected readonly materialQuery = signal('');
  private readonly materialList = httpResource<MaterialAvailability[]>(
    () => (this.materialQuery().trim().length >= 2 ? this.api.url(API_ENDPOINTS.materiasPrimas.existencias, { q: this.materialQuery().trim() }) : undefined),
    { defaultValue: [] },
  );
  protected readonly materials = computed(() => valueOr(this.materialList, []));

  protected clientInput = '';
  protected readonly clientEmail = signal('');
  protected readonly history = httpResource<Sale[]>(
    () => (this.clientEmail() ? this.api.url(API_ENDPOINTS.orders.byClient, { correo: this.clientEmail() }) : undefined),
    { defaultValue: [] },
  );
  protected readonly historyItems = computed(() => valueOr(this.history, []));

  protected channelLabel(tipo: string): string {
    return tipo === 'EN_LINEA' ? 'En línea' : tipo === 'ENCARGO' ? 'Encargo' : 'Mostrador';
  }

  protected statusLabel(estado: string): string {
    return ORDER_STATUS_LABELS[estado] ?? (estado === 'ANULADA' ? 'Anulada' : estado === 'COMPLETADA' ? 'Completada' : estado);
  }
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}
