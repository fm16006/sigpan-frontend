import { Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { MaterialExplosion } from '../../../../core/models/production.model';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { cantidadFaltante, insumosFaltantes } from '../../explosion-summary';

/**
 * Explosión de materiales: lo que necesita una producción frente a lo que hay en existencia.
 * Solo presenta; el cálculo (merma incluida) lo hace el backend.
 */
@Component({
  selector: 'app-explosion-table',
  imports: [DecimalPipe, StatusChip],
  template: `
    @if (message(); as text) {
      <p role="alert" class="rounded-box bg-error/10 px-4 py-3 text-sm">{{ text }}</p>
    } @else if (loading()) {
      <div class="h-28 animate-pulse rounded-box bg-base-200" aria-busy="true" aria-label="Calculando"></div>
    } @else if (explosion(); as result) {
      <div class="flex flex-col gap-3" aria-live="polite">
        <div class="flex flex-wrap items-center justify-between gap-2">
          @if (result.alcanza) {
            <app-status-chip tone="ok" label="Alcanza con la existencia actual" />
          } @else {
            <app-status-chip tone="bad" [label]="'Faltan ' + missing().length + (missing().length === 1 ? ' insumo' : ' insumos')" />
          }
          <span class="text-xs text-base-content/60">
            Merma {{ result.porcentajeMerma | number: '1.0-2' }} % incluida
          </span>
        </div>

        <div class="overflow-hidden rounded-box border border-base-300">
          <div class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 bg-base-200/50 px-4 py-2">
            <span class="list-th">Insumo</span>
            <span class="list-th text-end">Requerido</span>
            <span class="list-th text-end">Existencia</span>
            <span class="list-th"><span class="sr-only">Estado</span></span>
          </div>
          @for (insumo of result.insumos; track insumo.materiaPrimaId) {
            <div
              class="grid grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center gap-x-3 border-t border-base-300 px-4 py-2.5 text-sm"
            >
              <span class="truncate font-medium">{{ insumo.nombre }}</span>
              <span class="text-end tabular-nums">
                {{ insumo.cantidadRequerida | number: '1.0-3' }} {{ insumo.unidadMedida }}
              </span>
              <span class="text-end tabular-nums">
                {{ insumo.existencia | number: '1.0-3' }} {{ insumo.unidadMedida }}
              </span>
              @if (insumo.suficiente) {
                <app-status-chip tone="ok" label="Alcanza" />
              } @else {
                <app-status-chip tone="bad" [label]="'Faltan ' + (shortage(insumo) | number: '1.0-3')" />
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class ExplosionTable {
  readonly explosion = input<MaterialExplosion | null | undefined>(null);
  readonly loading = input(false);
  /** Mensaje cuando no se pudo calcular (por ejemplo, producto sin receta). */
  readonly message = input<string | null>(null);

  protected readonly missing = computed(() => insumosFaltantes(this.explosion()?.insumos ?? []));

  protected shortage = cantidadFaltante;
}
