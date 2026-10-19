import { Component, inject, signal } from '@angular/core';
import { asAppError } from '../../../../core/http/as-app-error';
import { Register } from '../../../../core/models/branch.model';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { BranchService } from '../../services/branch.service';
import { RegisterFormDrawer } from '../../ui/register-form-drawer';
import { BranchDetailStore } from './branch-detail.store';

/** Pestaña Cajas: las cajas de la sucursal, con alta, edición y desactivación. */
@Component({
  selector: 'app-branch-registers',
  imports: [Icon, StatusChip, ConfirmDialog, RegisterFormDrawer],
  template: `
    @if (store.branch(); as branch) {
      <section class="panel" aria-labelledby="suc-cajas">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div class="flex flex-col gap-0.5">
            <h2 id="suc-cajas" class="font-serif text-base font-semibold sm:text-lg">Cajas</h2>
            <p class="text-xs text-base-content/60">
              Los cajeros eligen una caja activa al abrir el punto de venta. Nombre y código son únicos en la
              sucursal.
            </p>
          </div>
          <button type="button" class="btn btn-primary btn-sm" (click)="openCreate()">
            <app-icon name="plus" /> Nueva caja
          </button>
        </div>

        <div class="overflow-hidden rounded-box border border-base-300">
          <div
            class="list-row max-md:hidden border-t-0! py-3! grid-cols-[minmax(0,2fr)_8rem_7rem_11rem]"
            aria-hidden="true"
          >
            <span class="list-th">Caja</span>
            <span class="list-th">Código</span>
            <span class="list-th">Estado</span>
            <span></span>
          </div>
          @for (register of branch.cajas; track register.id) {
            <div
              class="list-row grid-cols-[minmax(0,2fr)_8rem_7rem_11rem] max-md:grid-cols-[minmax(0,1fr)_auto] max-md:gap-y-2"
            >
              <span class="truncate font-semibold">{{ register.nombre }}</span>
              <span class="font-mono text-xs text-base-content/70 max-md:hidden">{{ register.codigo }}</span>
              <span class="max-md:justify-self-end">
                <app-status-chip
                  [label]="register.activo ? 'Activa' : 'Inactiva'"
                  [tone]="register.activo ? 'ok' : 'neutral'"
                />
              </span>
              <span class="flex justify-end gap-1 max-md:col-span-2">
                <button
                  type="button"
                  class="btn btn-ghost btn-xs"
                  [attr.aria-label]="'Editar ' + register.nombre"
                  (click)="openEdit(register)"
                >
                  <app-icon name="edit" [size]="14" /> Editar
                </button>
                @if (register.activo) {
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs text-error"
                    [attr.aria-label]="'Desactivar ' + register.nombre"
                    (click)="deactivating.set(register)"
                  >
                    Desactivar
                  </button>
                } @else {
                  <button
                    type="button"
                    class="btn btn-ghost btn-xs"
                    [disabled]="busy()"
                    [attr.aria-label]="'Activar ' + register.nombre"
                    (click)="activate(register)"
                  >
                    Activar
                  </button>
                }
              </span>
            </div>
          } @empty {
            <p class="border-t border-base-300 px-5 py-6 text-center text-sm text-base-content/60">
              Esta sucursal no tiene cajas.
            </p>
          }
        </div>
      </section>

      <app-register-form-drawer
        [open]="drawerOpen()"
        [branchId]="branch.id"
        [register]="editing()"
        (closed)="drawerOpen.set(false)"
        (saved)="onSaved()"
      />
      <app-confirm-dialog
        [open]="deactivating() !== null"
        title="Desactivar caja"
        [message]="
          '“' +
          (deactivating()?.nombre ?? '') +
          '” dejará de aparecer al abrir el punto de venta. Sus ventas anteriores se conservan. La sucursal necesita al menos una caja activa.'
        "
        confirmLabel="Desactivar"
        [busy]="busy()"
        (confirmed)="deactivate()"
        (cancelled)="deactivating.set(null)"
      />
    }
  `,
})
export class BranchRegisters {
  protected readonly store = inject(BranchDetailStore);
  private readonly service = inject(BranchService);
  private readonly notifications = inject(Notifications);

  protected readonly drawerOpen = signal(false);
  protected readonly editing = signal<Register | null>(null);
  protected readonly deactivating = signal<Register | null>(null);
  protected readonly busy = signal(false);

  protected openCreate(): void {
    this.editing.set(null);
    this.drawerOpen.set(true);
  }

  protected openEdit(register: Register): void {
    this.editing.set(register);
    this.drawerOpen.set(true);
  }

  protected onSaved(): void {
    this.drawerOpen.set(false);
    this.store.reload();
  }

  protected deactivate(): void {
    const register = this.deactivating();
    if (!register) return;
    this.busy.set(true);
    this.service.deactivateRegister(register.sucursalId, register.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deactivating.set(null);
        this.notifications.success(`"${register.nombre}" desactivada.`);
        this.store.reload();
      },
      error: () => {
        // El aviso (por ejemplo, última caja activa) ya lo muestra el interceptor.
        this.busy.set(false);
        this.deactivating.set(null);
      },
    });
  }

  protected activate(register: Register): void {
    this.busy.set(true);
    this.service
      .updateRegister(register.sucursalId, register.id, {
        nombre: register.nombre,
        codigo: register.codigo,
        activo: true,
      })
      .subscribe({
        next: () => {
          this.busy.set(false);
          this.notifications.success(`"${register.nombre}" activada.`);
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
