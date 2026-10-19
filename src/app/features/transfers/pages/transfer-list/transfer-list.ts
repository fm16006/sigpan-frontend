import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { Transfer } from '../../../../core/models/transfer.model';
import { Auth } from '../../../../core/services/auth';
import { BranchScope } from '../../../../core/services/branch-scope';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { filterTransfers, shortDate, transferKpis } from '../../transfer-calc';
import { TransferService } from '../../services/transfer.service';
import { TransferFormDrawer } from '../../ui/transfer-form-drawer';

/** Traslados entre sucursales: cada fila abre su ficha. Administración y bodega crean; jefatura consulta. */
@Component({
  selector: 'app-transfer-list',
  imports: [RouterLink, Icon, PageHeader, ResourceState, StatCard, TransferFormDrawer],
  template: `
    <app-page-header
      title="Traslados"
      subtitle="Materia prima y producto que se mueven de una sucursal a otra. Hacé clic en un traslado para ver sus líneas."
      [crumbs]="crumbs"
    >
      @if (canWrite) {
        <button type="button" class="btn btn-primary" (click)="drawerOpen.set(true)">
          <app-icon name="plus" /> Nuevo traslado
        </button>
      }
    </app-page-header>

    <div class="mb-4 grid grid-cols-3 gap-2 sm:max-w-2xl sm:gap-3">
      <app-stat-card label="Traslados" [value]="kpis().count" hint="Con el filtro actual" />
      <app-stat-card label="Líneas movidas" [value]="kpis().lines" />
      <app-stat-card label="Sucursales" [value]="kpis().branches" hint="Que intervienen" />
    </div>

    <div class="mb-4 flex flex-wrap items-end gap-2.5">
      <label class="input input-bordered flex min-w-0 flex-[1_1_15rem] items-center gap-2">
        <app-icon name="search" [size]="16" class="text-base-content/55" />
        <input
          type="search"
          class="grow"
          placeholder="Buscar por documento, sucursal o nota"
          aria-label="Buscar traslado"
          [value]="query()"
          (input)="query.set($any($event.target).value)"
        />
      </label>
      <label class="grid gap-1 text-xs text-base-content/60">
        Sucursal
        <select
          class="select select-bordered"
          aria-label="Filtrar por sucursal"
          (change)="setBranch($any($event.target).value)"
        >
          <option value="" [selected]="branchFilter() === null">Todas (origen o destino)</option>
          @for (branch of scope.branches(); track branch.id) {
            <option [value]="branch.id" [selected]="branchFilter() === branch.id">
              {{ branch.nombre }}
            </option>
          }
        </select>
      </label>
    </div>

    <app-resource-state
      [loading]="transfersRes.isLoading() && !transfersRes.hasValue()"
      [failed]="!!transfersRes.error()"
      [empty]="all().length === 0"
      emptyTitle="Sin traslados"
      emptyDescription="Todavía no se ha movido nada entre sucursales. Registrá el primero con “Nuevo traslado”."
      (retry)="transfersRes.reload()"
    >
      <section
        aria-label="Lista de traslados"
        class="overflow-hidden rounded-box border border-base-300 bg-base-100"
      >
        <div
          class="grid items-center gap-x-4 px-5 py-3.5 max-md:hidden md:grid-cols-[7.5rem_8rem_minmax(0,1.6fr)_4.5rem_minmax(0,1fr)_1rem]"
        >
          <span class="list-th">Fecha</span>
          <span class="list-th">Documento</span>
          <span class="list-th">Origen → destino</span>
          <span class="list-th text-right">Líneas</span>
          <span class="list-th">Registró</span>
          <span></span>
        </div>

        @for (transfer of rows(); track transfer.id) {
          <a
            class="list-row grid-cols-2 gap-y-1 md:grid-cols-[7.5rem_8rem_minmax(0,1.6fr)_4.5rem_minmax(0,1fr)_1rem]"
            [routerLink]="['/backoffice/transfers', transfer.id]"
            [attr.aria-label]="'Abrir el traslado ' + transfer.documento"
          >
            <span class="text-sm text-base-content/75 max-md:order-2">{{ date(transfer.fecha) }}</span>
            <span class="min-w-0 truncate font-mono text-sm font-semibold max-md:order-1">{{
              transfer.documento
            }}</span>
            <span class="flex min-w-0 items-center gap-1.5 text-sm max-md:order-3 max-md:col-span-2">
              <span class="truncate font-medium">{{ transfer.sucursalOrigen }}</span>
              <app-icon name="chevron" [size]="14" class="text-base-content/45" />
              <span class="truncate font-medium">{{ transfer.sucursalDestino }}</span>
            </span>
            <span class="tabular-nums md:text-right max-md:order-5">
              <span class="text-xs text-base-content/55 md:hidden">Líneas </span>{{ transfer.totalLineas }}
            </span>
            <span class="min-w-0 truncate text-sm text-base-content/70 max-md:order-4 max-md:justify-self-end">
              {{ transfer.usuario ?? '—' }}
            </span>
            <app-icon name="chevron" class="text-base-content/40 max-md:hidden" />
          </a>
        } @empty {
          <div class="border-t border-base-300 px-5 py-10 text-center text-sm text-base-content/60">
            Ningún traslado coincide con la búsqueda.
          </div>
        }

        <div class="border-t border-base-300 px-5 py-3 text-sm text-base-content/60">
          {{ rows().length }} de {{ all().length }} traslados · del más reciente al más antiguo
        </div>
      </section>
    </app-resource-state>

    @if (canWrite) {
      <app-transfer-form-drawer
        [open]="drawerOpen()"
        (closed)="drawerOpen.set(false)"
        (saved)="onSaved($event)"
      />
    }
  `,
})
export class TransferList {
  private readonly transfers = inject(TransferService);
  private readonly router = inject(Router);
  protected readonly scope = inject(BranchScope);

  /** `?nuevo=1` abre el panel de alta. */
  readonly nuevo = input<string>();

  /** Administración y bodega crean traslados; jefatura de producción solo consulta. */
  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly crumbs: readonly Crumb[] = [{ label: 'Inventario' }, { label: 'Traslados' }];
  protected readonly date = shortDate;

  protected readonly query = signal('');
  protected readonly branchFilter = signal<number | null>(null);
  protected readonly drawerOpen = signal(false);

  protected readonly transfersRes = httpResource<Transfer[]>(
    () => this.transfers.transfersUrl(this.branchFilter()),
    { defaultValue: [] },
  );
  protected readonly all = computed(() => valueOr(this.transfersRes, []));
  protected readonly rows = computed(() => filterTransfers(this.all(), this.query()));
  protected readonly kpis = computed(() => transferKpis(this.rows()));

  constructor() {
    effect(() => {
      if (this.nuevo() !== undefined && this.canWrite) {
        untracked(() => this.drawerOpen.set(true));
      }
    });
  }

  protected setBranch(value: string): void {
    this.branchFilter.set(value ? Number(value) : null);
  }

  protected onSaved(transfer: Transfer): void {
    this.drawerOpen.set(false);
    void this.router.navigate(['/backoffice/transfers', transfer.id]);
  }
}
