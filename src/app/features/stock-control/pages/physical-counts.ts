import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { valueOr } from '../../../core/http/resource-value';
import { PhysicalCount } from '../../../core/models/stock-control.model';
import { Auth } from '../../../core/services/auth';
import { Notifications } from '../../../core/services/notifications';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../shared/ui/status-chip/status-chip';

/** HU-54: hoja de conteo; al cerrar, las diferencias quedan como ajustes de toma física. */
@Component({
  selector: 'app-physical-counts',
  imports: [DatePipe, DecimalPipe, FormsModule, MoneyPipe, PageHeader, ResourceState, StatusChip, ConfirmDialog],
  template: `
    <app-page-header title="Toma física" subtitle="Conteo del inventario de insumos contra el sistema" [crumbs]="crumbs">
      @if (canWrite && !abierta()) {
        <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="abrir()">Nueva toma física</button>
      }
    </app-page-header>

    @if (abierta(); as toma) {
      <section class="mb-8 rounded-box border border-base-300 bg-base-100">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-base-300 px-4 py-3">
          <div>
            <h2 class="font-semibold">Toma #{{ toma.id }} · abierta {{ toma.fecha | date: 'd MMM y, HH:mm' }}</h2>
            <p class="text-sm text-base-content/60">{{ contados() }} de {{ toma.lineas.length }} insumos contados. Lo no contado no se ajusta.</p>
          </div>
          @if (canWrite) {
            <div class="flex gap-2">
              <button type="button" class="btn btn-sm" [disabled]="busy()" (click)="guardar()">Guardar conteo</button>
              <button type="button" class="btn btn-sm btn-primary" [disabled]="busy() || contados() === 0" (click)="confirmar.set('cerrar')">
                Cerrar y ajustar
              </button>
              <button type="button" class="btn btn-sm btn-ghost text-error" [disabled]="busy()" (click)="confirmar.set('anular')">Anular</button>
            </div>
          }
        </header>
        <div class="overflow-x-auto">
          <table class="table table-sm">
            <thead>
              <tr>
                <th>Insumo</th><th class="text-end">Sistema</th><th class="text-end">Contado</th>
                <th class="text-end">Diferencia</th><th class="text-end">Valor</th>
              </tr>
            </thead>
            <tbody>
              @for (l of toma.lineas; track l.materiaPrimaId) {
                <tr>
                  <td>{{ l.materiaPrima }}</td>
                  <td class="text-end tabular-nums">{{ l.saldoSistema | number: '1.0-3' }} {{ l.unidad }}</td>
                  <td class="text-end">
                    <input
                      class="input input-sm w-28 text-end"
                      type="number"
                      min="0"
                      step="any"
                      [disabled]="!canWrite"
                      [ngModel]="conteos()[l.materiaPrimaId]"
                      (ngModelChange)="contar(l.materiaPrimaId, $event)"
                      [attr.aria-label]="'Contado de ' + l.materiaPrima"
                    />
                  </td>
                  <td class="text-end tabular-nums" [class.text-error]="diferencia(l.materiaPrimaId, l.saldoSistema) < 0"
                      [class.text-success]="diferencia(l.materiaPrimaId, l.saldoSistema) > 0">
                    {{ conteos()[l.materiaPrimaId] == null ? '—' : (diferencia(l.materiaPrimaId, l.saldoSistema) | number: '1.0-3') }}
                  </td>
                  <td class="text-end tabular-nums">
                    {{ conteos()[l.materiaPrimaId] == null || l.costoUnitario == null ? '—' : (diferencia(l.materiaPrimaId, l.saldoSistema) * l.costoUnitario | money) }}
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </section>
    }

    <h2 class="mb-3 text-lg font-semibold">Historial</h2>
    <app-resource-state
      [loading]="list.isLoading()"
      [failed]="!!list.error()"
      [empty]="cerradas().length === 0"
      emptyTitle="Sin tomas anteriores"
      (retry)="list.reload()"
    >
      <ul class="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100">
        @for (t of cerradas(); track t.id) {
          <li class="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
            <span>#{{ t.id }} · {{ t.fecha | date: 'd MMM y' }} · {{ t.usuario ?? '—' }}</span>
            <span class="flex items-center gap-3">
              <span class="tabular-nums">{{ t.contados }} contados · diferencia {{ t.valorDiferencia | money }}</span>
              <app-status-chip [label]="t.estado === 'CERRADA' ? 'Cerrada' : 'Anulada'" [tone]="t.estado === 'CERRADA' ? 'ok' : 'neutral'" />
            </span>
          </li>
        }
      </ul>
    </app-resource-state>

    <app-confirm-dialog
      [open]="confirmar() !== null"
      [title]="confirmar() === 'cerrar' ? 'Cerrar toma física' : 'Anular toma física'"
      [message]="confirmar() === 'cerrar'
        ? 'Se registrará un ajuste por cada insumo contado con diferencia, contra la existencia de este momento.'
        : 'La toma se descarta sin ajustar el inventario.'"
      [confirmLabel]="confirmar() === 'cerrar' ? 'Cerrar y ajustar' : 'Anular'"
      [busy]="busy()"
      (confirmed)="ejecutar()"
      (cancelled)="confirmar.set(null)"
    />
  `,
})
export class PhysicalCounts {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);
  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly crumbs = [{ label: 'Inventario' }, { label: 'Alertas', link: '/backoffice/stock-control' }, { label: 'Toma física' }];

  protected readonly list = httpResource<PhysicalCount[]>(() => this.api.url(API_ENDPOINTS.tomasFisicas.root), { defaultValue: [] });
  private readonly items = computed(() => valueOr(this.list, []));
  protected readonly abierta = computed(() => this.items().find((t) => t.estado === 'ABIERTA') ?? null);
  protected readonly cerradas = computed(() => this.items().filter((t) => t.estado !== 'ABIERTA'));

  /** Lo tecleado; parte de lo guardado en el servidor. */
  private readonly editados = signal<Record<number, number | null>>({});
  protected readonly conteos = computed<Record<number, number | null>>(() => {
    const base: Record<number, number | null> = {};
    for (const l of this.abierta()?.lineas ?? []) base[Number(l.materiaPrimaId)] = l.contado;
    return { ...base, ...this.editados() };
  });
  protected readonly contados = computed(() => Object.values(this.conteos()).filter((v) => v != null).length);

  protected readonly busy = signal(false);
  protected readonly confirmar = signal<'cerrar' | 'anular' | null>(null);

  protected contar(id: number, valor: number | string | null): void {
    const numero = valor === '' || valor == null ? null : Number(valor);
    this.editados.update((m) => ({ ...m, [id]: numero }));
  }

  protected diferencia(id: number, sistema: number): number {
    return Number(this.conteos()[id] ?? 0) - Number(sistema);
  }

  protected abrir(): void {
    this.busy.set(true);
    this.api.post<PhysicalCount>(API_ENDPOINTS.tomasFisicas.root, {}).subscribe({
      next: () => this.done('Toma física abierta. Contá y anotá cada insumo.'),
      error: () => this.busy.set(false),
    });
  }

  protected guardar(after?: () => void): void {
    const toma = this.abierta();
    if (!toma) return;
    const body = Object.entries(this.editados()).map(([id, contado]) => ({ materiaPrimaId: Number(id), contado }));
    if (body.length === 0) {
      after ? after() : this.notifications.success('No hay cambios por guardar.');
      return;
    }
    this.busy.set(true);
    this.api.put<PhysicalCount>(API_ENDPOINTS.tomasFisicas.conteos(toma.id), body).subscribe({
      next: () => {
        this.editados.set({});
        if (after) after();
        else this.done('Conteo guardado.');
      },
      error: () => this.busy.set(false),
    });
  }

  protected ejecutar(): void {
    const toma = this.abierta();
    const accion = this.confirmar();
    this.confirmar.set(null);
    if (!toma || !accion) return;
    if (accion === 'anular') {
      this.busy.set(true);
      this.api.post<PhysicalCount>(API_ENDPOINTS.tomasFisicas.anular(toma.id)).subscribe({
        next: () => this.done('Toma física anulada.'),
        error: () => this.busy.set(false),
      });
      return;
    }
    this.guardar(() => {
      this.busy.set(true);
      this.api.post<PhysicalCount>(API_ENDPOINTS.tomasFisicas.cerrar(toma.id)).subscribe({
        next: () => this.done('Toma cerrada: las diferencias quedaron como ajustes.'),
        error: () => this.busy.set(false),
      });
    });
  }

  private done(message: string): void {
    this.busy.set(false);
    this.editados.set({});
    this.notifications.success(message);
    this.list.reload();
  }
}
