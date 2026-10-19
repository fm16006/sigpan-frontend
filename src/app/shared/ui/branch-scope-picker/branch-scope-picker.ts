import { Component, inject } from '@angular/core';
import { BranchScope } from '../../../core/services/branch-scope';
import { Icon } from '../icon/icon';

/**
 * Selector de sucursal de las pantallas de inventario. Arranca en la sucursal del usuario;
 * administración además puede elegir «Todas las sucursales» para ver la suma.
 */
@Component({
  selector: 'app-branch-scope-picker',
  imports: [Icon],
  template: `
    <label
      class="inline-flex items-center gap-2 rounded-lg border border-base-300 bg-base-100 pl-3 text-sm"
    >
      <app-icon name="store" [size]="16" class="text-base-content/55" />
      <span class="sr-only md:not-sr-only md:text-base-content/60">Sucursal</span>
      <select
        class="select select-ghost h-10 min-h-10 min-w-0 pl-1 font-semibold focus:outline-none"
        aria-label="Sucursal"
        [disabled]="scope.loading() && scope.branches().length === 0"
        (change)="onChange($any($event.target).value)"
      >
        @if (scope.canSeeAll()) {
          <option value="todas" [selected]="scope.isAll()">Todas las sucursales</option>
        }
        @for (branch of scope.activeBranches(); track branch.id) {
          <option [value]="branch.id" [selected]="scope.branchId() === branch.id">
            {{ branch.nombre }}
          </option>
        }
      </select>
    </label>
  `,
})
export class BranchScopePicker {
  protected readonly scope = inject(BranchScope);

  protected onChange(value: string): void {
    this.scope.select(value === 'todas' ? 'todas' : Number(value));
  }
}
