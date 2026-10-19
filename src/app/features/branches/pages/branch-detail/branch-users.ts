import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROLE_LABELS } from '../../../../core/models/user.model';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { BranchDetailStore } from './branch-detail.store';

/** Pestaña Usuarios: el personal asignado a la sucursal. La asignación se cambia en Usuarios. */
@Component({
  selector: 'app-branch-users',
  imports: [RouterLink, StatusChip],
  template: `
    <section class="panel" aria-labelledby="suc-usuarios">
      <div class="flex flex-col gap-0.5">
        <h2 id="suc-usuarios" class="font-serif text-base font-semibold sm:text-lg">Personal asignado</h2>
        <p class="text-xs text-base-content/60">
          Para mover a alguien de sucursal, editá su cuenta en
          <a routerLink="/backoffice/users" class="link">Usuarios</a>.
        </p>
      </div>

      @if (store.usersLoading() && store.users().length === 0) {
        <div class="h-24 animate-pulse rounded-box bg-base-200" aria-busy="true"></div>
      } @else if (store.usersFailed()) {
        <div role="alert" class="alert alert-error text-sm">
          <span>No pudimos cargar los usuarios.</span>
          <button type="button" class="btn btn-sm" (click)="store.reload()">Reintentar</button>
        </div>
      } @else if (store.users().length === 0) {
        <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/65">
          Nadie está asignado a esta sucursal todavía.
        </p>
      } @else {
        <div class="overflow-hidden rounded-box border border-base-300">
          <div
            class="list-row max-md:hidden border-t-0! py-3! grid-cols-[minmax(0,2fr)_10rem_7rem]"
            aria-hidden="true"
          >
            <span class="list-th">Usuario</span>
            <span class="list-th">Rol</span>
            <span class="list-th">Estado</span>
          </div>
          @for (user of store.users(); track user.id) {
            <div
              class="list-row grid-cols-[minmax(0,2fr)_10rem_7rem] max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-1"
            >
              <span class="flex min-w-0 flex-col">
                <span class="truncate font-semibold">{{ user.nombre }}</span>
                <span class="truncate text-xs text-base-content/60">{{ user.email }}</span>
              </span>
              <span class="text-sm max-md:order-last max-md:col-span-2 max-md:text-base-content/65">
                {{ roleLabels[user.rol] }}
              </span>
              <app-status-chip
                [label]="user.activo ? 'Activo' : 'Inactivo'"
                [tone]="user.activo ? 'ok' : 'neutral'"
              />
            </div>
          }
        </div>
      }
    </section>
  `,
})
export class BranchUsers {
  protected readonly store = inject(BranchDetailStore);
  protected readonly roleLabels = ROLE_LABELS;
}
