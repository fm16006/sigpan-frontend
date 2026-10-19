import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { Purchase, Supplier } from '../../../../core/models/purchase.model';
import { Auth } from '../../../../core/services/auth';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { SupplierService } from '../../../suppliers/services/supplier.service';
import {
  daysAgoIso,
  documentLabel,
  filterPurchases,
  purchaseKpis,
  shortDate,
} from '../../purchase-calc';
import { PurchaseService } from '../../services/purchase.service';
import { PurchaseFormDrawer } from '../../ui/purchase-form-drawer';

/** Compras a proveedores: filtros por proveedor y fechas; cada fila abre su detalle. */
@Component({
  selector: 'app-purchase-list',
  imports: [RouterLink, MoneyPipe, Icon, PageHeader, ResourceState, StatCard, PurchaseFormDrawer],
  template: `
    <app-page-header
      title="Compras"
      subtitle="Lo que se le compró a cada proveedor. Hacé clic en una compra para ver sus líneas."
      [crumbs]="crumbs"
    >
      @if (canWrite) {
        <button type="button" class="btn btn-primary" (click)="drawerOpen.set(true)">
          <app-icon name="plus" /> Nueva compra
        </button>
      }
    </app-page-header>

    <div class="mb-4 grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
      <app-stat-card label="Compras" [value]="kpis().count" hint="En el período filtrado" />
      <app-stat-card label="Total comprado" [value]="kpis().total | money" />
      <app-stat-card label="Proveedores" [value]="kpis().suppliers" />
    </div>

    <div class="mb-4 flex flex-wrap items-end gap-2.5">
      <label class="input input-bordered flex min-w-0 flex-[1_1_15rem] items-center gap-2">
        <app-icon name="search" [size]="16" class="text-base-content/55" />
        <input
          type="search"
          class="grow"
          placeholder="Buscar por documento o proveedor"
          aria-label="Buscar compra"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </label>
      <label class="grid gap-1 text-xs text-base-content/60">
        Proveedor
        <select
          class="select select-bordered"
          aria-label="Proveedor"
          [value]="supplierId() ?? ''"
          (change)="setSupplier($any($event.target).value)"
        >
          <option value="">Todos</option>
          @for (supplier of supplierOptions(); track supplier.id) {
            <option [value]="supplier.id">{{ supplier.nombre }}</option>
          }
        </select>
      </label>
      <label class="grid gap-1 text-xs text-base-content/60">
        Desde
        <input
          #fromInput
          type="date"
          class="input input-bordered"
          [max]="to() || today"
          [value]="from()"
          (change)="from.set(fromInput.value)"
        />
      </label>
      <label class="grid gap-1 text-xs text-base-content/60">
        Hasta
        <input
          #toInput
          type="date"
          class="input input-bordered"
          [min]="from()"
          [max]="today"
          [value]="to()"
          (change)="to.set(toInput.value)"
        />
      </label>
    </div>

    @if (rangeInvalid()) {
      <div role="alert" class="alert alert-warning mb-4 py-2 text-sm">
        La fecha inicial no puede ser posterior a la final.
      </div>
    }

    <app-resource-state
      [loading]="purchasesRes.isLoading() && !purchasesRes.hasValue()"
      [failed]="!!purchasesRes.error() && !rangeInvalid()"
      [empty]="all().length === 0"
      emptyTitle="Sin compras"
      emptyDescription="No hay compras con estos filtros. Probá ampliando las fechas o registrá una nueva."
      (retry)="purchasesRes.reload()"
    >
      <section aria-label="Lista de compras" class="overflow-hidden rounded-box border border-base-300 bg-base-100">
        <div
          class="grid items-center gap-x-4 px-5 py-3.5 max-md:hidden md:grid-cols-[7.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)_4.5rem_6.5rem_1rem]"
        >
          <span class="list-th">Fecha</span>
          <span class="list-th">Documento</span>
          <span class="list-th">Proveedor</span>
          <span class="list-th text-right">Líneas</span>
          <span class="list-th text-right">Total</span>
          <span></span>
        </div>

        @for (purchase of rows(); track purchase.id) {
          <a
            class="list-row grid-cols-2 gap-y-1 md:grid-cols-[7.5rem_minmax(0,1.2fr)_minmax(0,1.4fr)_4.5rem_6.5rem_1rem]"
            [routerLink]="['/backoffice/purchases', purchase.id]"
            [attr.aria-label]="'Abrir la compra ' + label(purchase)"
          >
            <span class="text-sm text-base-content/75 max-md:order-2">{{ date(purchase.fecha) }}</span>
            <span class="min-w-0 truncate font-semibold max-md:order-1">{{ label(purchase) }}</span>
            <span class="min-w-0 truncate text-sm max-md:order-3">{{ purchase.proveedor }}</span>
            <span class="tabular-nums md:text-right max-md:order-5">
              <span class="text-xs text-base-content/55 md:hidden">Líneas </span>{{ purchase.totalLineas }}
            </span>
            <span class="font-semibold tabular-nums md:text-right max-md:order-4 max-md:justify-self-end">
              {{ purchase.total | money }}
            </span>
            <app-icon name="chevron" class="text-base-content/40 max-md:hidden" />
          </a>
        } @empty {
          <div class="border-t border-base-300 px-5 py-10 text-center text-sm text-base-content/60">
            Ninguna compra coincide con la búsqueda.
          </div>
        }

        <div class="border-t border-base-300 px-5 py-3 text-sm text-base-content/60">
          {{ rows().length }} de {{ all().length }} compras · de la más reciente a la más antigua
        </div>
      </section>
    </app-resource-state>

    @if (canWrite) {
      <app-purchase-form-drawer
        [open]="drawerOpen()"
        (closed)="drawerOpen.set(false)"
        (saved)="onSaved($event)"
      />
    }
  `,
})
export class PurchaseList {
  private readonly purchases = inject(PurchaseService);
  private readonly suppliers = inject(SupplierService);
  private readonly router = inject(Router);

  /** `?nueva=1` abre el panel de alta (lo usa el enlace «Nueva compra» desde otras pantallas). */
  readonly nueva = input<string>();

  /** Administración y bodega escriben; jefe de producción solo consulta. */
  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly crumbs: readonly Crumb[] = [{ label: 'Inventario' }, { label: 'Compras' }];
  protected readonly today = todayIso();
  protected readonly date = shortDate;

  protected readonly query = signal('');
  protected readonly supplierId = signal<number | null>(null);
  protected readonly from = signal(daysAgoIso(30));
  protected readonly to = signal(todayIso());
  protected readonly drawerOpen = signal(false);

  protected readonly rangeInvalid = computed(
    () => !!this.from() && !!this.to() && this.from() > this.to(),
  );

  protected readonly purchasesRes = httpResource<Purchase[]>(
    () =>
      this.rangeInvalid()
        ? undefined
        : this.purchases.purchasesUrl({
            proveedorId: this.supplierId(),
            desde: this.from(),
            hasta: this.to(),
          }),
    { defaultValue: [] },
  );
  private readonly supplierRes = httpResource<Supplier[]>(() => this.suppliers.suppliersUrl(), {
    defaultValue: [],
  });

  protected readonly all = computed(() => (this.rangeInvalid() ? [] : valueOr(this.purchasesRes, [])));
  protected readonly rows = computed(() => filterPurchases(this.all(), this.query()));
  protected readonly kpis = computed(() => purchaseKpis(this.rows()));
  protected readonly supplierOptions = computed(() =>
    [...valueOr(this.supplierRes, [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );

  constructor() {
    effect(() => {
      if (this.nueva() !== undefined && this.canWrite) {
        untracked(() => this.drawerOpen.set(true));
      }
    });
  }

  protected label(purchase: Purchase): string {
    return documentLabel(purchase.tipoDocumento, purchase.numeroDocumento);
  }

  protected setSupplier(value: string): void {
    this.supplierId.set(value ? Number(value) : null);
  }

  protected onSaved(purchase: Purchase): void {
    this.drawerOpen.set(false);
    void this.router.navigate(['/backoffice/purchases', purchase.id]);
  }
}
