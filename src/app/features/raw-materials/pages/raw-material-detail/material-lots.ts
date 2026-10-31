import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject } from '@angular/core';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { MaterialAvailability } from '../../../../core/models/stock-control.model';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { MaterialDetailStore } from './material-detail.store';

/** HU-65 y HU-67: lotes con existencia; las salidas consumen primero el que vence antes. */
@Component({
  selector: 'app-material-lots',
  imports: [DatePipe, DecimalPipe, ResourceState, StatusChip],
  template: `
    <app-resource-state
      [loading]="data.isLoading()"
      [failed]="!!data.error()"
      [empty]="lotes().length === 0"
      emptyTitle="Sin lotes con existencia"
      emptyDescription="Cada compra registra su lote y vencimiento."
      (retry)="data.reload()"
    >
      <section class="overflow-x-auto rounded-box border border-base-300 bg-base-100" aria-label="Lotes">
        <table class="table table-sm">
          <thead>
            <tr><th>Lote</th><th>Vence</th><th>Estado</th><th class="text-end">Ingresó</th><th class="text-end">Queda</th></tr>
          </thead>
          <tbody>
            @for (l of lotes(); track l.id) {
              <tr>
                <td>{{ l.numero ?? 'Sin número' }}</td>
                <td class="tabular-nums">{{ l.fechaVencimiento ? (l.fechaVencimiento | date: 'd MMM y') : '—' }}</td>
                <td>
                  @if (l.diasRestantes === null) {
                    <app-status-chip label="Sin vencimiento" tone="neutral" />
                  } @else if (l.diasRestantes < 0) {
                    <app-status-chip label="Vencido" tone="bad" />
                  } @else if (l.diasRestantes <= 7) {
                    <app-status-chip [label]="'Vence en ' + l.diasRestantes + ' d'" tone="warn" />
                  } @else {
                    <app-status-chip label="Vigente" tone="ok" />
                  }
                </td>
                <td class="text-end tabular-nums">{{ l.cantidadInicial | number: '1.0-3' }}</td>
                <td class="text-end font-semibold tabular-nums">{{ l.cantidad | number: '1.0-3' }} {{ l.unidad }}</td>
              </tr>
            }
          </tbody>
        </table>
        <p class="border-t border-base-300 px-5 py-3 text-sm text-base-content/60">
          Las salidas y la producción consumen primero el lote que vence antes (FEFO).
        </p>
      </section>
    </app-resource-state>
  `,
})
export class MaterialLots {
  private readonly store = inject(MaterialDetailStore);
  private readonly api = inject(ApiClient);

  protected readonly data = httpResource<MaterialAvailability>(() =>
    this.api.url(API_ENDPOINTS.materiasPrimas.existencia(this.store.id())),
  );
  protected readonly lotes = computed(() => (this.data.hasValue() ? this.data.value().lotes : []));
}
