import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { asAppError } from '../../../../core/http/as-app-error';
import { Branch } from '../../../../core/models/branch.model';
import { Notifications } from '../../../../core/services/notifications';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DetailHeader, DetailTab } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { BranchService } from '../../services/branch.service';
import { BranchFormDrawer } from '../../ui/branch-form-drawer';
import { BranchDetailStore } from './branch-detail.store';

/** Ficha de una sucursal: encabezado con acciones, datos de contacto y pestañas como rutas hijas. */
@Component({
  selector: 'app-branch-detail',
  imports: [
    RouterOutlet,
    RouterLink,
    DetailHeader,
    StatusChip,
    Icon,
    ConfirmDialog,
    BranchFormDrawer,
  ],
  providers: [BranchDetailStore],
  template: `
    @if (store.branch(); as branch) {
      <app-detail-header [crumbs]="crumbs()" [title]="branch.nombre" [code]="branch.codigo" [tabs]="tabs()">
        <div
          media
          class="grid size-16 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 text-base-content/70"
          aria-hidden="true"
        >
          <app-icon name="store" [size]="30" [stroke]="1.5" />
        </div>
        <div chips class="contents">
          <app-status-chip [label]="branch.activo ? 'Activa' : 'Inactiva'" [tone]="branch.activo ? 'ok' : 'neutral'" />
        </div>
        <div actions class="contents">
          <button type="button" class="btn" (click)="editing.set(true)">
            <app-icon name="edit" /> Editar
          </button>
          @if (branch.activo) {
            <button type="button" class="btn btn-ghost text-error" (click)="confirmingDeactivate.set(true)">
              Desactivar
            </button>
          } @else {
            <button type="button" class="btn btn-ghost" [disabled]="busy()" (click)="activate(branch)">
              Activar
            </button>
          }
        </div>
      </app-detail-header>

      <dl class="mb-6 grid gap-x-6 gap-y-3 rounded-box border border-base-300 bg-base-100 px-5 py-4 text-sm sm:grid-cols-3">
        <div>
          <dt class="text-xs text-base-content/60">Dirección</dt>
          <dd class="font-medium">{{ branch.direccion || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-base-content/60">Teléfono</dt>
          <dd class="font-medium tabular-nums">{{ branch.telefono || '—' }}</dd>
        </div>
        <div>
          <dt class="text-xs text-base-content/60">Horario</dt>
          <dd class="font-medium">{{ branch.horario || '—' }}</dd>
        </div>
      </dl>

      <router-outlet />

      <app-branch-form-drawer
        [open]="editing()"
        [branch]="branch"
        (closed)="editing.set(false)"
        (saved)="onSaved()"
      />
      <app-confirm-dialog
        [open]="confirmingDeactivate()"
        title="Desactivar sucursal"
        [message]="
          '“' +
          branch.nombre +
          '” pasará a estado Inactiva. Sus ventas y su historial se conservan. No se puede desactivar la única sucursal activa ni una con usuarios activos asignados.'
        "
        confirmLabel="Desactivar"
        [busy]="busy()"
        (confirmed)="deactivate(branch)"
        (cancelled)="confirmingDeactivate.set(false)"
      />
    } @else if (store.failed()) {
      <div role="alert" class="alert alert-error">
        <span>No pudimos cargar esta sucursal.</span>
        <a routerLink="/backoffice/branches" class="btn btn-sm">Volver a Sucursales</a>
        <button type="button" class="btn btn-sm" (click)="store.reload()">Reintentar</button>
      </div>
    } @else {
      <div class="grid gap-3" aria-busy="true" aria-live="polite">
        <div class="h-24 animate-pulse rounded-box bg-base-200"></div>
        <div class="h-40 animate-pulse rounded-box bg-base-200"></div>
      </div>
    }
  `,
})
export class BranchDetail {
  protected readonly store = inject(BranchDetailStore);
  private readonly service = inject(BranchService);
  private readonly notifications = inject(Notifications);

  protected readonly editing = signal(false);
  protected readonly confirmingDeactivate = signal(false);
  protected readonly busy = signal(false);

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: 'Administración' },
    { label: 'Sucursales', link: '/backoffice/branches' },
    { label: this.store.branch()?.nombre ?? '' },
  ]);

  protected readonly tabs = computed<DetailTab[]>(() => [
    { label: 'Cajas', path: '', count: this.store.branch()?.cajas.length ?? null },
    { label: 'Usuarios', path: 'usuarios', count: this.store.users().length },
  ]);

  protected onSaved(): void {
    this.editing.set(false);
    this.store.reload();
  }

  protected deactivate(branch: Branch): void {
    this.busy.set(true);
    this.service.deactivate(branch.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirmingDeactivate.set(false);
        this.notifications.success(`"${branch.nombre}" desactivada.`);
        this.store.reload();
      },
      error: () => {
        // El aviso del error (por ejemplo, usuarios asignados) ya lo muestra el interceptor.
        this.busy.set(false);
        this.confirmingDeactivate.set(false);
      },
    });
  }

  protected activate(branch: Branch): void {
    this.busy.set(true);
    this.service
      .update(branch.id, {
        nombre: branch.nombre,
        codigo: branch.codigo,
        direccion: branch.direccion,
        telefono: branch.telefono,
        horario: branch.horario,
        activo: true,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notifications.success(`"${branch.nombre}" activada.`);
          this.store.reload();
        },
        error: (error: unknown) => {
          this.busy.set(false);
          const appError = asAppError(error);
          if (appError.kind === 'validation') this.notifications.error(appError.message);
        },
      });
  }
}
