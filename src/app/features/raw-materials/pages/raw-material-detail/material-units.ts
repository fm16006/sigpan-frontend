import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { AltUnit } from '../../../../core/models/stock-control.model';
import { Notifications } from '../../../../core/services/notifications';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { MaterialDetailStore } from './material-detail.store';

/** HU-66: unidades de compra con su factor a la unidad base. */
@Component({
  selector: 'app-material-units',
  imports: [DecimalPipe, FormsModule, ResourceState],
  template: `
    @if (store.canWrite) {
      <form class="mb-4 flex flex-wrap items-end gap-3" (ngSubmit)="agregar()">
        <label class="grid gap-1 text-sm">
          <span>Unidad de compra</span>
          <input class="input input-sm" name="nombre" maxlength="30" placeholder="Saco 25 kg" [(ngModel)]="nombre" required />
        </label>
        <label class="grid gap-1 text-sm">
          <span>Equivale a ({{ store.row()?.unidad }})</span>
          <input class="input input-sm w-32" type="number" min="0.0001" step="any" name="factor" [(ngModel)]="factor" required />
        </label>
        <button class="btn btn-sm btn-primary" [disabled]="saving()">Agregar</button>
      </form>
    }
    <app-resource-state
      [loading]="units.isLoading()"
      [failed]="!!units.error()"
      [empty]="items().length === 0"
      emptyTitle="Sin unidades alternas"
      emptyDescription="Las compras se registran en la unidad base."
      (retry)="units.reload()"
    >
      <ul class="divide-y divide-base-300 rounded-box border border-base-300 bg-base-100">
        @for (u of items(); track u.id) {
          <li class="flex items-center justify-between px-4 py-3 text-sm">
            <span><strong>1 {{ u.nombre }}</strong> = {{ u.factor | number: '1.0-4' }} {{ u.unidadBase }}</span>
            @if (store.canWrite) {
              <button type="button" class="btn btn-ghost btn-xs text-error" (click)="quitar(u)">Quitar</button>
            }
          </li>
        }
      </ul>
    </app-resource-state>
  `,
})
export class MaterialUnits {
  protected readonly store = inject(MaterialDetailStore);
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);

  protected readonly units = httpResource<AltUnit[]>(() => this.api.url(API_ENDPOINTS.materiasPrimas.unidades(this.store.id())), {
    defaultValue: [],
  });
  protected readonly items = computed(() => valueOr(this.units, []));
  protected readonly saving = signal(false);
  protected nombre = '';
  protected factor: number | null = null;

  protected agregar(): void {
    if (!this.nombre.trim() || !this.factor || this.factor <= 0) return;
    this.saving.set(true);
    this.api
      .post<AltUnit>(API_ENDPOINTS.materiasPrimas.unidades(this.store.id()), { nombre: this.nombre.trim(), factor: this.factor })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.nombre = '';
          this.factor = null;
          this.units.reload();
        },
        error: () => this.saving.set(false),
      });
  }

  protected quitar(u: AltUnit): void {
    this.api.delete<void>(API_ENDPOINTS.materiasPrimas.unidad(this.store.id(), u.id)).subscribe(() => {
      this.notifications.success(`Unidad "${u.nombre}" quitada.`);
      this.units.reload();
    });
  }
}
