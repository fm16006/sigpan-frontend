import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DetailHeader, DetailTab } from '../../../../shared/ui/detail-header/detail-header';
import { BranchScopePicker } from '../../../../shared/ui/branch-scope-picker/branch-scope-picker';
import { Icon } from '../../../../shared/ui/icon/icon';
import { hasInventory } from '../../../../core/models/inventory.model';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { Notifications } from '../../../../core/services/notifications';
import { MATERIAL_STATUS_CHIP } from '../../raw-material-calc';
import { InventoryService } from '../../services/inventory.service';
import { AdjustmentDrawer } from '../../ui/adjustment-drawer';
import { MaterialFormDrawer } from '../../ui/material-form-drawer';
import { PurchaseDrawer } from '../../ui/purchase-drawer';
import { MaterialDetailStore } from './material-detail.store';

type Drawer = 'edit' | 'purchase' | 'adjustment' | null;

/** Ficha de un insumo: encabezado con acciones y pestañas como rutas hijas. */
@Component({
  selector: 'app-raw-material-detail',
  imports: [
    RouterOutlet,
    RouterLink,
    DetailHeader,
    StatusChip,
    Icon,
    BranchScopePicker,
    ConfirmDialog,
    MaterialFormDrawer,
    PurchaseDrawer,
    AdjustmentDrawer,
  ],
  providers: [MaterialDetailStore],
  template: `
    @if (store.row(); as row) {
      <app-detail-header [crumbs]="crumbs()" [title]="row.nombre" [code]="row.codigo" [tabs]="tabs()">
        <div
          media
          class="grid size-16 shrink-0 place-items-center rounded-box border border-base-300 bg-base-200 text-base-content/70"
          aria-hidden="true"
        >
          <app-icon name="sack" [size]="30" [stroke]="1.5" />
        </div>
        <div chips class="contents">
          <span class="rounded-md bg-base-200 px-2 py-0.5 text-xs text-base-content/75"
            >Unidad base: {{ row.unidad }}</span
          >
          <app-status-chip [label]="chip().label" [tone]="chip().tone" />
        </div>
        <div actions class="contents">
          <app-branch-scope-picker />
          @if (store.canWrite) {
            <button type="button" class="btn" (click)="drawer.set('edit')">
              <app-icon name="edit" /> Editar
            </button>
            <button
              type="button"
              class="btn"
              [disabled]="!store.scope.canWrite()"
              [attr.title]="store.scope.canWrite() ? null : 'Elegí una sucursal para registrar movimientos'"
              (click)="drawer.set('adjustment')"
            >
              Registrar salida o ajuste
            </button>
            <button
              type="button"
              class="btn btn-primary"
              [disabled]="!store.scope.canWrite()"
              [attr.title]="store.scope.canWrite() ? null : 'Elegí una sucursal para registrar movimientos'"
              (click)="drawer.set('purchase')"
            >
              <app-icon name="plus" /> Registrar compra
            </button>
            @if (row.activo) {
              <button type="button" class="btn btn-ghost text-error" (click)="confirmingDeactivate.set(true)">
                Desactivar
              </button>
            }
          }
        </div>
      </app-detail-header>

      @if (!hasInventory(row) && store.canWrite && store.scope.canWrite()) {
        <div role="alert" class="alert alert-warning mb-5 text-sm">
          <span>Este insumo todavía no tiene inventario habilitado en {{ store.scope.label() }}, así que no puede recibir movimientos.</span>
          <button type="button" class="btn btn-sm" [disabled]="opening()" (click)="openStock()">
            @if (opening()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
            Habilitar inventario
          </button>
        </div>
      }

      <router-outlet />

      <app-material-form-drawer
        [open]="drawer() === 'edit'"
        [material]="store.current() ?? null"
        (closed)="drawer.set(null)"
        (saved)="onSaved()"
      />
      <app-purchase-drawer
        [open]="drawer() === 'purchase'"
        [materialId]="store.id()"
        (closed)="drawer.set(null)"
        (saved)="onSaved()"
      />
      <app-adjustment-drawer
        [open]="drawer() === 'adjustment'"
        title="Registrar salida o ajuste"
        [materialId]="store.id()"
        (closed)="drawer.set(null)"
        (saved)="onSaved()"
      />
      <app-confirm-dialog
        [open]="confirmingDeactivate()"
        title="Desactivar materia prima"
        [message]="
          '“' +
          row.nombre +
          '” pasará a estado Inactivo. Su existencia y su historial de movimientos se conservan.'
        "
        confirmLabel="Desactivar"
        [busy]="deactivating()"
        (confirmed)="deactivate()"
        (cancelled)="confirmingDeactivate.set(false)"
      />
    } @else if (store.failed()) {
      <div role="alert" class="alert alert-error">
        <span>No pudimos cargar esta materia prima.</span>
        <a routerLink="/backoffice/raw-materials" class="btn btn-sm">Volver a Materia prima</a>
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
export class RawMaterialDetail {
  protected readonly store = inject(MaterialDetailStore);
  private readonly service = inject(InventoryService);
  private readonly notifications = inject(Notifications);

  protected readonly drawer = signal<Drawer>(null);
  protected readonly confirmingDeactivate = signal(false);
  protected readonly deactivating = signal(false);
  protected readonly opening = signal(false);
  protected readonly hasInventory = hasInventory;

  protected readonly crumbs = computed<Crumb[]>(() => [
    { label: 'Inventario' },
    { label: 'Materia prima', link: '/backoffice/raw-materials' },
    { label: this.store.row()?.nombre ?? '' },
  ]);

  protected readonly tabs = computed<DetailTab[]>(() => [
    { label: 'Resumen', path: '' },
    { label: 'Movimientos', path: 'movimientos', count: this.store.movementList().length },
  ]);

  protected readonly chip = computed(() => MATERIAL_STATUS_CHIP[this.store.row()?.estado ?? 'suficiente']);

  protected onSaved(): void {
    this.drawer.set(null);
    this.store.reload();
  }

  protected openStock(): void {
    const row = this.store.row();
    if (!row) return;
    this.opening.set(true);
    this.service.openStock('materia-prima', row.itemId, this.store.scope.branchId()).subscribe({
      next: () => {
        this.opening.set(false);
        this.notifications.success(`Inventario de "${row.nombre}" habilitado.`);
        this.store.reload();
      },
      error: () => this.opening.set(false),
    });
  }

  protected deactivate(): void {
    const row = this.store.row();
    if (!row) return;
    this.deactivating.set(true);
    this.service.deactivateMaterial(row.itemId).subscribe({
      next: () => {
        this.deactivating.set(false);
        this.confirmingDeactivate.set(false);
        this.notifications.success(`"${row.nombre}" desactivada.`);
        this.store.reload();
      },
      error: () => {
        this.deactivating.set(false);
        this.confirmingDeactivate.set(false);
      },
    });
  }
}
