import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, input, output, signal } from '@angular/core';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { Formula, FormulaVersion } from '../../../../core/models/production.model';
import { diffVersions } from '../../recipe-diff';

/** HU-17: historial de versiones de una receta y comparación entre dos. */
@Component({
  selector: 'app-recipe-versions',
  imports: [DatePipe, DecimalPipe],
  host: { '(document:keydown.escape)': 'closed.emit()' },
  template: `
    <div class="fixed inset-0 z-50 grid place-items-center p-4">
      <button type="button" class="absolute inset-0 cursor-default bg-neutral/45" aria-label="Cerrar" tabindex="-1" (click)="closed.emit()"></button>
      <div role="dialog" aria-modal="true" [attr.aria-label]="'Versiones de ' + formula().nombre"
           class="relative flex max-h-[90vh] w-full max-w-3xl flex-col gap-4 overflow-y-auto rounded-box border border-base-300 bg-base-100 p-6 shadow-xl">
        <header class="flex items-start justify-between gap-3">
          <div>
            <h2 class="text-xl font-semibold">Versiones de {{ formula().nombre }}</h2>
            <p class="text-sm text-base-content/60">Cada orden de producción guarda la versión con la que se hizo.</p>
          </div>
          <button type="button" class="btn btn-ghost btn-sm" (click)="closed.emit()">Cerrar</button>
        </header>

        @if (versions.isLoading()) {
          <div class="h-24 animate-pulse rounded-box bg-base-200"></div>
        } @else {
          <ul class="divide-y divide-base-300 rounded-box border border-base-300">
            @for (v of items(); track v.version) {
              <li class="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                <span>
                  <strong>v{{ v.version }}</strong>
                  @if (v.vigente) { <span class="badge badge-success badge-sm ms-1">vigente</span> }
                  · desde {{ v.vigenteDesde | date: 'd MMM y, HH:mm' }}
                  @if (v.vigenteHasta) { hasta {{ v.vigenteHasta | date: 'd MMM y, HH:mm' }} }
                  · {{ v.usuario ?? '—' }}
                </span>
                <span class="flex gap-1">
                  <button type="button" class="btn btn-xs" [class.btn-primary]="left() === v.version" (click)="left.set(v.version)">A</button>
                  <button type="button" class="btn btn-xs" [class.btn-primary]="right() === v.version" (click)="right.set(v.version)">B</button>
                </span>
              </li>
            }
          </ul>

          @if (pair(); as p) {
            <section>
              <h3 class="mb-2 font-semibold">v{{ p.a.version }} → v{{ p.b.version }}</h3>
              <p class="mb-2 text-sm text-base-content/70">
                Rinde {{ p.a.contenido.cantidadProduccion | number: '1.0-3' }} → {{ p.b.contenido.cantidadProduccion | number: '1.0-3' }} ·
                merma {{ p.a.contenido.porcentajeMerma | number: '1.0-2' }}% → {{ p.b.contenido.porcentajeMerma | number: '1.0-2' }}%
              </p>
              <table class="table table-sm">
                <thead><tr><th>Insumo</th><th class="text-end">A</th><th class="text-end">B</th><th></th></tr></thead>
                <tbody>
                  @for (r of diff(); track r.materiaPrima) {
                    <tr [class.opacity-60]="r.cambio === 'igual'">
                      <td>{{ r.materiaPrima }}</td>
                      <td class="text-end tabular-nums">{{ r.antes === null ? '—' : (r.antes | number: '1.0-3') + ' ' + r.unidad }}</td>
                      <td class="text-end tabular-nums">{{ r.despues === null ? '—' : (r.despues | number: '1.0-3') + ' ' + r.unidad }}</td>
                      <td>
                        @switch (r.cambio) {
                          @case ('agregado') { <span class="badge badge-success badge-sm">agregado</span> }
                          @case ('quitado') { <span class="badge badge-error badge-sm">quitado</span> }
                          @case ('cambiado') { <span class="badge badge-warning badge-sm">cambió</span> }
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </section>
          }
        }
      </div>
    </div>
  `,
})
export class RecipeVersions {
  private readonly api = inject(ApiClient);
  readonly formula = input.required<Formula>();
  readonly closed = output<void>();

  protected readonly versions = httpResource<FormulaVersion[]>(() => this.api.url(API_ENDPOINTS.formulas.versiones(this.formula().id)), {
    defaultValue: [],
  });
  protected readonly items = computed(() => [...valueOr(this.versions, [])].sort((a, b) => b.version - a.version));

  protected readonly left = signal<number | null>(null);
  protected readonly right = signal<number | null>(null);

  /** Por defecto compara la vigente contra la anterior. */
  protected readonly pair = computed(() => {
    const list = this.items();
    if (list.length < 2) return null;
    const a = list.find((v) => v.version === this.left()) ?? list[1];
    const b = list.find((v) => v.version === this.right()) ?? list[0];
    return a.version < b.version ? { a, b } : { a: b, b: a };
  });
  protected readonly diff = computed(() => {
    const p = this.pair();
    return p ? diffVersions(p.a, p.b) : [];
  });
}
