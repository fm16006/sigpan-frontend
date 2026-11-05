import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { Kardex, MOVEMENT_CLASS_LABEL } from '../../../../core/models/stock-control.model';
import { downloadCsv } from '../../../../core/utils/csv';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { MaterialDetailStore } from './material-detail.store';

/** HU-12: kárdex valorado por rango de fechas, exportable a CSV. */
@Component({
  selector: 'app-material-kardex',
  imports: [DatePipe, DecimalPipe, FormsModule, MoneyPipe, ResourceState, StatusChip],
  template: `
    <form class="mb-4 flex flex-wrap items-end gap-3" (submit)="$event.preventDefault()">
      <label class="grid gap-1 text-sm">
        <span>Desde</span>
        <input class="input input-sm" type="date" name="desde" [ngModel]="desde()" (ngModelChange)="desde.set($event)" />
      </label>
      <label class="grid gap-1 text-sm">
        <span>Hasta</span>
        <input class="input input-sm" type="date" name="hasta" [ngModel]="hasta()" (ngModelChange)="hasta.set($event)" />
      </label>
      <button type="button" class="btn btn-sm" [disabled]="!data()" (click)="exportar()">Exportar CSV</button>
    </form>

    <app-resource-state
      [loading]="kardex.isLoading()"
      [failed]="!!kardex.error()"
      [empty]="(data()?.filas?.length ?? 0) === 0"
      emptyTitle="Sin movimientos"
      emptyDescription="No hay movimientos en el rango elegido."
      (retry)="kardex.reload()"
    >
      @if (data(); as k) {
        <section class="overflow-x-auto rounded-box border border-base-300 bg-base-100" aria-label="Kárdex del insumo">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Clase</th>
                <th>Motivo / documento</th>
                <th>Lotes</th>
                <th class="text-end">Entrada</th>
                <th class="text-end">Salida</th>
                <th class="text-end">Saldo</th>
                <th class="text-end">Costo prom.</th>
                <th class="text-end">Valor</th>
                <th>Usuario</th>
              </tr>
            </thead>
            <tbody>
              <tr class="bg-base-200/50">
                <td colspan="6" class="font-medium">Saldo inicial</td>
                <td class="text-end tabular-nums">{{ k.saldoInicial | number: '1.0-3' }}</td>
                <td></td>
                <td class="text-end tabular-nums">{{ k.valorInicial | money }}</td>
                <td></td>
              </tr>
              @for (f of k.filas; track f.id) {
                <tr>
                  <td class="whitespace-nowrap tabular-nums">{{ f.fecha | date: 'd MMM y, HH:mm' }}</td>
                  <td>
                    <app-status-chip [label]="claseLabel(f.clase, f.tipo)" [tone]="f.tipo === 'ENTRADA' ? 'ok' : f.clase === 'MERMA' ? 'warn' : 'info'" />
                  </td>
                  <td class="max-w-56 truncate">{{ f.motivo ?? f.documento ?? '—' }}</td>
                  <td class="max-w-48 truncate text-xs">{{ f.lotes ?? '—' }}</td>
                  <td class="text-end tabular-nums text-success">{{ f.entrada ? (f.entrada | number: '1.0-3') : '' }}</td>
                  <td class="text-end tabular-nums">{{ f.salida ? (f.salida | number: '1.0-3') : '' }}</td>
                  <td class="text-end font-semibold tabular-nums">{{ f.saldo | number: '1.0-3' }}</td>
                  <td class="text-end tabular-nums">{{ f.costoUnitario | money }}</td>
                  <td class="text-end tabular-nums">{{ f.valor | money }}</td>
                  <td class="text-xs">{{ f.usuario ?? '—' }}</td>
                </tr>
              }
              <tr class="bg-base-200/50">
                <td colspan="6" class="font-medium">Saldo final</td>
                <td class="text-end font-semibold tabular-nums">{{ k.saldoFinal | number: '1.0-3' }} {{ k.unidad }}</td>
                <td></td>
                <td class="text-end font-semibold tabular-nums">{{ k.valorFinal | money }}</td>
                <td></td>
              </tr>
            </tbody>
          </table>
          <p class="border-t border-base-300 px-5 py-3 text-sm text-base-content/60">
            Los movimientos no se editan ni se borran: un error se corrige con un ajuste.
          </p>
        </section>
      }
    </app-resource-state>
  `,
})
export class MaterialKardex {
  protected readonly store = inject(MaterialDetailStore);
  private readonly api = inject(ApiClient);

  protected readonly desde = signal(isoDaysAgo(30));
  protected readonly hasta = signal(isoDaysAgo(0));

  protected readonly kardex = httpResource<Kardex>(() =>
    this.api.url(API_ENDPOINTS.materiasPrimas.kardex(this.store.id()), {
      desde: this.desde() || undefined,
      hasta: this.hasta() || undefined,
    }),
  );
  protected readonly data = computed(() => (this.kardex.hasValue() ? this.kardex.value() : null));

  protected claseLabel(clase: string | null, tipo: string): string {
    return (clase && MOVEMENT_CLASS_LABEL[clase]) || (tipo === 'ENTRADA' ? 'Entrada' : 'Salida');
  }

  protected exportar(): void {
    const k = this.data();
    if (!k) return;
    downloadCsv(
      `kardex-${k.materiaPrima}-${this.desde()}-${this.hasta()}.csv`,
      ['Fecha', 'Tipo', 'Clase', 'Motivo', 'Documento', 'Lotes', 'Entrada', 'Salida', 'Saldo', 'Costo unitario', 'Valor', 'Usuario'],
      [
        ['', 'SALDO INICIAL', '', '', '', '', '', '', k.saldoInicial, '', k.valorInicial, ''],
        ...k.filas.map((f) => [
          f.fecha, f.tipo, f.clase, f.motivo, f.documento, f.lotes, f.entrada, f.salida, f.saldo, f.costoUnitario, f.valor, f.usuario,
        ]),
        ['', 'SALDO FINAL', '', '', '', '', '', '', k.saldoFinal, '', k.valorFinal, ''],
      ],
    );
  }
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
