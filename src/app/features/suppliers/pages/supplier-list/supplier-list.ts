import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { Supplier } from '../../../../core/models/purchase.model';
import { Auth } from '../../../../core/services/auth';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { shortDate } from '../../../purchases/purchase-calc';
import { SupplierService } from '../../services/supplier.service';
import { SupplierSegment, filterSuppliers, segmentCounts } from '../../supplier-view';
import { SupplierDrawer } from '../../ui/supplier-drawer';

@Component({
  selector: 'app-supplier-list',
  imports: [RouterLink, PageHeader, ResourceState, StatusChip, Icon, SupplierDrawer],
  template: `
    <app-page-header
      title="Proveedores"
      subtitle="A quién le comprás insumos y productos de reventa. Hacé clic en uno para ver sus compras."
      [crumbs]="crumbs"
    >
      @if (canWrite) {
        <button type="button" class="btn btn-primary" (click)="drawerOpen.set(true)">
          <app-icon name="plus" /> Nuevo proveedor
        </button>
      }
    </app-page-header>

    <div class="mb-4 flex flex-wrap items-center gap-2.5">
      <label class="input input-bordered flex min-w-0 flex-1 basis-64 items-center gap-2">
        <app-icon name="search" [size]="16" class="text-base-content/55" />
        <input
          type="search"
          class="grow"
          placeholder="Buscar por nombre, contacto o NIT"
          aria-label="Buscar proveedor"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </label>
      <div
        role="group"
        aria-label="Estado del proveedor"
        class="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-[10px] bg-base-200 p-[3px]"
      >
        @for (item of segments; track item.value) {
          <button
            type="button"
            class="whitespace-nowrap rounded-[7px] px-3 py-1.5 text-sm text-base-content/65"
            [class]="
              segment() === item.value
                ? 'bg-base-100 font-semibold !text-base-content shadow-sm ring-1 ring-base-300'
                : 'font-medium'
            "
            [attr.aria-pressed]="segment() === item.value"
            (click)="segment.set(item.value)"
          >
            {{ item.label }}
            <span class="opacity-65">{{ counts()[item.value] }}</span>
          </button>
        }
      </div>
    </div>

    <app-resource-state
      [loading]="suppliers.isLoading() && !suppliers.hasValue()"
      [failed]="!!suppliers.error()"
      [empty]="all().length === 0"
      emptyTitle="Sin proveedores"
      emptyDescription="Registrá el primer proveedor para poder cargar compras."
      (retry)="suppliers.reload()"
    >
      <section
        aria-label="Lista de proveedores"
        class="overflow-hidden rounded-box border border-base-300 bg-base-100"
      >
        <div
          class="grid items-center gap-x-4 px-5 py-3.5 max-md:hidden md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_5rem_7.5rem_6.5rem_1rem]"
        >
          <span class="list-th">Proveedor</span>
          <span class="list-th">Contacto</span>
          <span class="list-th text-right">Compras</span>
          <span class="list-th">Última compra</span>
          <span class="list-th">Estado</span>
          <span></span>
        </div>

        @for (supplier of rows(); track supplier.id) {
          <a
            class="list-row grid-cols-2 gap-y-1 md:grid-cols-[minmax(0,1.6fr)_minmax(0,1.3fr)_5rem_7.5rem_6.5rem_1rem]"
            [routerLink]="['/backoffice/suppliers', supplier.id]"
            [attr.aria-label]="'Abrir la ficha de ' + supplier.nombre"
          >
            <span class="flex min-w-0 flex-col">
              <span class="truncate font-semibold">{{ supplier.nombre }}</span>
              <span class="font-mono text-xs text-base-content/60">
                {{ supplier.nit ? 'NIT ' + supplier.nit : 'Sin NIT' }}
              </span>
            </span>
            <span class="flex min-w-0 flex-col max-md:col-span-2">
              <span class="truncate text-sm">{{ supplier.contacto }}</span>
              <span class="truncate text-xs text-base-content/60">{{ supplier.telefono }}</span>
            </span>
            <span class="tabular-nums md:text-right">
              <span class="text-xs text-base-content/55 md:hidden">Compras </span>{{ supplier.compras }}
            </span>
            <span class="text-sm text-base-content/75 max-md:hidden">{{ date(supplier.ultimaCompra) }}</span>
            <app-status-chip
              class="max-md:justify-self-end"
              [tone]="supplier.activo ? 'ok' : 'neutral'"
              [label]="supplier.activo ? 'Activo' : 'Inactivo'"
            />
            <app-icon name="chevron" class="text-base-content/40 max-md:hidden" />
          </a>
        } @empty {
          <div class="border-t border-base-300 px-5 py-10 text-center text-sm text-base-content/60">
            Ningún proveedor coincide con la búsqueda.
          </div>
        }

        <div class="border-t border-base-300 px-5 py-3 text-sm text-base-content/60">
          {{ rows().length }} de {{ all().length }} proveedores · ordenados por nombre
        </div>
      </section>
    </app-resource-state>

    @if (canWrite) {
      <app-supplier-drawer
        [open]="drawerOpen()"
        (closed)="drawerOpen.set(false)"
        (saved)="onCreated($event)"
      />
    }
  `,
})
export class SupplierList {
  private readonly service = inject(SupplierService);
  private readonly router = inject(Router);

  /** Administración y bodega escriben; jefe de producción solo consulta. */
  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly crumbs: readonly Crumb[] = [{ label: 'Inventario' }, { label: 'Proveedores' }];
  protected readonly segments: readonly { value: SupplierSegment; label: string }[] = [
    { value: 'activos', label: 'Activos' },
    { value: 'inactivos', label: 'Inactivos' },
    { value: 'todos', label: 'Todos' },
  ];
  protected readonly date = shortDate;

  protected readonly suppliers = httpResource<Supplier[]>(() => this.service.suppliersUrl(), {
    defaultValue: [],
  });

  protected readonly all = computed(() => valueOr(this.suppliers, []));
  protected readonly query = signal('');
  protected readonly segment = signal<SupplierSegment>('activos');
  protected readonly drawerOpen = signal(false);

  protected readonly counts = computed(() => segmentCounts(this.all()));
  protected readonly rows = computed(() =>
    filterSuppliers(this.all(), this.query(), this.segment()),
  );

  protected onCreated(supplier: Supplier): void {
    this.drawerOpen.set(false);
    void this.router.navigate(['/backoffice/suppliers', supplier.id]);
  }
}
