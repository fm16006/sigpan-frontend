import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { valueOr } from '../../../core/http/resource-value';
import { Lot, ReorderAlert } from '../../../core/models/stock-control.model';
import { downloadCsv } from '../../../core/utils/csv';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../shared/ui/status-chip/status-chip';

/** HU-13 y HU-65: qué comprar y qué vence pronto. */
@Component({
  selector: 'app-stock-alerts',
  imports: [DatePipe, DecimalPipe, FormsModule, RouterLink, PageHeader, ResourceState, StatusChip],
  template: `
    <app-page-header title="Alertas de inventario" subtitle="Insumos por reponer y lotes por vencer" [crumbs]="crumbs">
      <a routerLink="tomas" class="btn">Toma física</a>
    </app-page-header>

    <section class="mb-8">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Por reponer ({{ alerts().length }})</h2>
        <button type="button" class="btn btn-sm" [disabled]="alerts().length === 0" (click)="exportar()">
          Exportar lista de compra
        </button>
      </div>
      <app-resource-state
        [loading]="reorder.isLoading()"
        [failed]="!!reorder.error()"
        [empty]="alerts().length === 0"
        emptyTitle="Nada por reponer"
        emptyDescription="Ningún insumo llegó a su punto de reorden."
        (retry)="reorder.reload()"
      >
        <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Insumo</th><th>Estado</th><th class="text-end">Existencia</th>
                <th class="text-end">Punto de reorden</th><th class="text-end">Mínimo</th><th class="text-end">Sugerido comprar</th>
              </tr>
            </thead>
            <tbody>
              @for (a of alerts(); track a.materiaPrimaId) {
                <tr>
                  <td><a class="link-hover" [routerLink]="['/backoffice/raw-materials', a.materiaPrimaId]">{{ a.materiaPrima }}</a></td>
                  <td><app-status-chip [label]="a.critico ? 'Bajo el mínimo' : 'Reordenar'" [tone]="a.critico ? 'bad' : 'warn'" /></td>
                  <td class="text-end tabular-nums">{{ a.existencia | number: '1.0-3' }} {{ a.unidad }}</td>
                  <td class="text-end tabular-nums">{{ a.puntoReorden | number: '1.0-3' }}</td>
                  <td class="text-end tabular-nums">{{ a.stockMinimo | number: '1.0-3' }}</td>
                  <td class="text-end font-semibold tabular-nums">{{ a.sugerido | number: '1.0-3' }} {{ a.unidad }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-resource-state>
    </section>

    <section>
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h2 class="text-lg font-semibold">Lotes por vencer ({{ lots().length }})</h2>
        <label class="flex items-center gap-2 text-sm">
          En los próximos
          <select class="select select-sm" [ngModel]="dias()" (ngModelChange)="dias.set($event)">
            <option [ngValue]="3">3 días</option>
            <option [ngValue]="7">7 días</option>
            <option [ngValue]="15">15 días</option>
            <option [ngValue]="30">30 días</option>
          </select>
        </label>
      </div>
      <app-resource-state
        [loading]="expiring.isLoading()"
        [failed]="!!expiring.error()"
        [empty]="lots().length === 0"
        emptyTitle="Nada por vencer"
        emptyDescription="Ningún lote con existencia vence en ese plazo."
        (retry)="expiring.reload()"
      >
        <div class="overflow-x-auto rounded-box border border-base-300 bg-base-100">
          <table class="table table-sm">
            <thead>
              <tr><th>Insumo</th><th>Lote</th><th>Vence</th><th></th><th class="text-end">Queda</th></tr>
            </thead>
            <tbody>
              @for (l of lots(); track l.id) {
                <tr>
                  <td><a class="link-hover" [routerLink]="['/backoffice/raw-materials', l.materiaPrimaId, 'lotes']">{{ l.materiaPrima }}</a></td>
                  <td>{{ l.numero ?? 'Sin número' }}</td>
                  <td class="tabular-nums">{{ l.fechaVencimiento | date: 'd MMM y' }}</td>
                  <td>
                    <app-status-chip
                      [label]="(l.diasRestantes ?? 0) < 0 ? 'Vencido' : (l.diasRestantes === 0 ? 'Vence hoy' : 'En ' + l.diasRestantes + ' d')"
                      [tone]="(l.diasRestantes ?? 0) <= 2 ? 'bad' : 'warn'"
                    />
                  </td>
                  <td class="text-end tabular-nums">{{ l.cantidad | number: '1.0-3' }} {{ l.unidad }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </app-resource-state>
    </section>
  `,
})
export class StockAlerts {
  private readonly api = inject(ApiClient);
  protected readonly crumbs = [{ label: 'Inventario' }, { label: 'Alertas' }];

  protected readonly dias = signal(7);
  protected readonly reorder = httpResource<ReorderAlert[]>(() => this.api.url(API_ENDPOINTS.materiasPrimas.alertasReorden), {
    defaultValue: [],
  });
  protected readonly expiring = httpResource<Lot[]>(
    () => this.api.url(API_ENDPOINTS.materiasPrimas.porVencer, { dias: this.dias() }),
    { defaultValue: [] },
  );
  protected readonly alerts = computed(() => valueOr(this.reorder, []));
  protected readonly lots = computed(() => valueOr(this.expiring, []));

  protected exportar(): void {
    downloadCsv(
      'lista-de-compra.csv',
      ['Insumo', 'Unidad', 'Existencia', 'Punto de reorden', 'Mínimo', 'Sugerido'],
      this.alerts().map((a) => [a.materiaPrima, a.unidad, a.existencia, a.puntoReorden, a.stockMinimo, a.sugerido]),
    );
  }
}
