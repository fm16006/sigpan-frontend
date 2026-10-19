import { DatePipe, DecimalPipe } from '@angular/common';
import { Component, inject } from '@angular/core';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { MaterialDetailStore } from './material-detail.store';

/** Pestaña Movimientos: kárdex del insumo con saldo corrido. */
@Component({
  selector: 'app-material-kardex',
  imports: [DatePipe, DecimalPipe, MoneyPipe, ResourceState, StatusChip],
  template: `
    @if (store.row(); as row) {
      <app-resource-state
        [loading]="store.movements.isLoading()"
        [failed]="!!store.movements.error()"
        [empty]="store.kardex().length === 0"
        emptyTitle="Sin movimientos"
        emptyDescription="Las compras, salidas y ajustes de este insumo aparecen aquí con su saldo."
        (retry)="store.reload()"
      >
        <section
          class="overflow-hidden rounded-box border border-base-300 bg-base-100"
          aria-label="Kárdex del insumo"
        >
          <div
            class="list-row max-md:hidden border-t-0! py-3.5! grid-cols-[8.5rem_6rem_minmax(0,1.2fr)_minmax(0,1fr)_6.5rem_6rem_6.5rem]"
            aria-hidden="true"
          >
            <span class="list-th">Fecha</span>
            <span class="list-th">Tipo</span>
            <span class="list-th">Motivo</span>
            <span class="list-th">Documento</span>
            <span class="list-th text-end">Cantidad</span>
            <span class="list-th text-end">Costo prom.</span>
            <span class="list-th text-end">Saldo</span>
          </div>
          @for (line of store.kardex(); track line.movement.id) {
            <div
              class="list-row grid-cols-[8.5rem_6rem_minmax(0,1.2fr)_minmax(0,1fr)_6.5rem_6rem_6.5rem] max-md:grid-cols-2 max-md:gap-y-1.5"
            >
              <span class="text-sm tabular-nums">{{ line.movement.fecha | date: 'd MMM y, HH:mm' }}</span>
              <app-status-chip
                [label]="line.movement.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'"
                [tone]="line.movement.tipo === 'ENTRADA' ? 'ok' : 'info'"
              />
              <span class="truncate text-sm">{{ line.movement.motivo ?? '—' }}</span>
              <span class="truncate text-sm">{{ line.movement.documento ?? '—' }}</span>
              <span
                class="text-end font-semibold tabular-nums"
                [class.text-success]="line.delta > 0"
              >
                {{ line.delta > 0 ? '+' : '−' }}{{ line.movement.cantidad | number: '1.0-3' }}
              </span>
              <span class="text-end tabular-nums max-md:hidden">{{ line.movement.costoFinal | money }}</span>
              <span class="text-end font-semibold tabular-nums">
                {{ line.saldo | number: '1.0-3' }} {{ row.unidad }}
              </span>
            </div>
          }
          <div class="border-t border-base-300 px-5 py-3 text-sm text-base-content/60">
            {{ store.kardex().length }} movimientos. No se editan ni se borran: un error se corrige con un ajuste.
          </div>
        </section>
      </app-resource-state>
    }
  `,
})
export class MaterialKardex {
  protected readonly store = inject(MaterialDetailStore);
}
