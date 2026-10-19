import { Component, computed, inject, input, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { Purchase, Supplier } from '../../../../core/models/purchase.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DetailHeader } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { documentLabel, purchaseKpis, shortDate } from '../../../purchases/purchase-calc';
import { PurchaseService } from '../../../purchases/services/purchase.service';
import { PurchaseFormDrawer } from '../../../purchases/ui/purchase-form-drawer';
import { SupplierService } from '../../services/supplier.service';
import { SupplierDrawer } from '../../ui/supplier-drawer';

type Drawer = 'edit' | 'purchase' | null;

/** Ficha de un proveedor: contacto, resumen y las compras que se le hicieron. */
@Component({
  selector: 'app-supplier-detail',
  imports: [
    RouterLink,
    DetailHeader,
    ResourceState,
    StatCard,
    StatusChip,
    ConfirmDialog,
    Icon,
    MoneyPipe,
    SupplierDrawer,
    PurchaseFormDrawer,
  ],
  template: `
    <app-resource-state
      [loading]="supplierRes.isLoading() && !current()"
      [failed]="!!supplierRes.error() && !current()"
      (retry)="reloadAll()"
    >
      @if (current(); as s) {
        <app-detail-header [crumbs]="crumbs()" [title]="s.nombre" [code]="s.nit ? 'NIT ' + s.nit : null">
          <div chips class="contents">
            <app-status-chip [tone]="s.activo ? 'ok' : 'neutral'" [label]="s.activo ? 'Activo' : 'Inactivo'" />
          </div>
          <div actions class="contents">
            @if (canWrite) {
              <button type="button" class="btn" (click)="drawer.set('edit')">
                <app-icon name="edit" /> Editar
              </button>
              @if (s.activo) {
                <button type="button" class="btn btn-primary" (click)="drawer.set('purchase')">
                  <app-icon name="plus" /> Nueva compra
                </button>
                <button type="button" class="btn btn-ghost text-error" (click)="confirming.set(true)">
                  Desactivar
                </button>
              } @else {
                <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="setActive(true)">
                  Reactivar
                </button>
              }
            }
          </div>
        </app-detail-header>

        <div class="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <app-stat-card label="Compras" [value]="s.compras" />
          <app-stat-card label="Total comprado" [value]="kpis().total | money" />
          <app-stat-card label="Última compra" [value]="date(s.ultimaCompra)" />
          <app-stat-card
            label="Estado"
            [value]="s.activo ? 'Activo' : 'Inactivo'"
            [hint]="s.activo ? 'Admite nuevas compras' : 'Solo conserva su historial'"
          />
        </div>

        <div class="grid items-start gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
          <section class="panel min-w-0" aria-labelledby="h-compras">
            <h2 id="h-compras" class="font-serif text-lg font-semibold">Compras</h2>
            <app-resource-state
              [loading]="purchasesRes.isLoading() && !purchasesRes.hasValue()"
              [failed]="!!purchasesRes.error()"
              [empty]="purchases().length === 0"
              emptyTitle="Sin compras"
              emptyDescription="Todavía no se le compró a este proveedor."
              (retry)="purchasesRes.reload()"
            >
              <div class="-mx-[1.375rem] -mb-5 overflow-hidden border-t border-base-300">
                @for (purchase of purchases(); track purchase.id) {
                  <a
                    class="list-row grid-cols-[minmax(0,1fr)_auto_1rem] gap-y-0.5"
                    [routerLink]="['/backoffice/purchases', purchase.id]"
                    [attr.aria-label]="'Abrir la compra ' + label(purchase)"
                  >
                    <span class="flex min-w-0 flex-col">
                      <span class="truncate font-semibold">{{ label(purchase) }}</span>
                      <span class="text-xs text-base-content/60">
                        {{ date(purchase.fecha) }} · {{ purchase.totalLineas }}
                        {{ purchase.totalLineas === 1 ? 'línea' : 'líneas' }}
                      </span>
                    </span>
                    <span class="font-semibold tabular-nums">{{ purchase.total | money }}</span>
                    <app-icon name="chevron" class="text-base-content/40" />
                  </a>
                }
              </div>
            </app-resource-state>
          </section>

          <section class="panel" aria-labelledby="h-contacto">
            <h2 id="h-contacto" class="font-serif text-lg font-semibold">Contacto</h2>
            <dl class="grid grid-cols-[6rem_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
              <dt class="text-base-content/60">Persona</dt>
              <dd>{{ s.contacto }}</dd>
              <dt class="text-base-content/60">Teléfono</dt>
              <dd>
                <a class="hover:underline" [href]="'tel:' + s.telefono">{{ s.telefono }}</a>
              </dd>
              <dt class="text-base-content/60">Correo</dt>
              <dd class="break-all">
                <a class="hover:underline" [href]="'mailto:' + s.email">{{ s.email }}</a>
              </dd>
              <dt class="text-base-content/60">NIT</dt>
              <dd class="font-mono text-[0.8rem]">{{ s.nit ?? 'Sin NIT' }}</dd>
            </dl>
          </section>
        </div>

        @if (canWrite) {
          <app-supplier-drawer
            [open]="drawer() === 'edit'"
            [supplier]="s"
            (closed)="drawer.set(null)"
            (saved)="onEdited()"
          />
          <app-purchase-form-drawer
            [open]="drawer() === 'purchase'"
            [supplierId]="s.id"
            (closed)="drawer.set(null)"
            (saved)="onPurchased()"
          />
        }

        <app-confirm-dialog
          [open]="confirming()"
          title="Desactivar proveedor"
          [message]="
            '«' + s.nombre + '» pasará a Inactivo y no podrás registrarle compras nuevas. Sus ' + s.compras + ' compras y su historial se conservan, y podés reactivarlo cuando quieras.'
          "
          confirmLabel="Desactivar"
          [busy]="busy()"
          (confirmed)="setActive(false)"
          (cancelled)="confirming.set(false)"
        />
      }
    </app-resource-state>
  `,
})
export class SupplierDetail {
  private readonly service = inject(SupplierService);
  private readonly purchaseService = inject(PurchaseService);
  private readonly notifications = inject(Notifications);

  /** Parámetro `:id` de la ruta. */
  readonly id = input.required<string>();

  /** Administración y bodega escriben; jefe de producción solo consulta. */
  protected readonly canWrite = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly date = shortDate;

  protected readonly supplierRes = httpResource<Supplier>(() =>
    this.service.supplierUrl(Number(this.id())),
  );
  protected readonly purchasesRes = httpResource<Purchase[]>(
    () => this.purchaseService.purchasesUrl({ proveedorId: Number(this.id()) }),
    { defaultValue: [] },
  );

  protected readonly current = computed(() => valueOr<Supplier | undefined>(this.supplierRes, undefined));
  protected readonly purchases = computed(() => valueOr(this.purchasesRes, []));
  protected readonly kpis = computed(() => purchaseKpis(this.purchases()));

  protected readonly drawer = signal<Drawer>(null);
  protected readonly confirming = signal(false);
  protected readonly busy = signal(false);

  protected readonly crumbs = computed<readonly Crumb[]>(() => [
    { label: 'Inventario' },
    { label: 'Proveedores', link: '/backoffice/suppliers' },
    { label: this.current()?.nombre ?? '' },
  ]);

  protected label(purchase: Purchase): string {
    return documentLabel(purchase.tipoDocumento, purchase.numeroDocumento);
  }

  protected reloadAll(): void {
    this.supplierRes.reload();
    this.purchasesRes.reload();
  }

  protected onEdited(): void {
    this.drawer.set(null);
    this.supplierRes.reload();
  }

  protected onPurchased(): void {
    this.drawer.set(null);
    this.reloadAll();
  }

  protected setActive(activo: boolean): void {
    const supplier = this.current();
    if (!supplier) return;

    this.busy.set(true);
    this.service.setActive(supplier.id, activo).subscribe({
      next: () => {
        this.busy.set(false);
        this.confirming.set(false);
        this.notifications.success(
          activo ? `"${supplier.nombre}" reactivado.` : `"${supplier.nombre}" desactivado.`,
        );
        this.supplierRes.reload();
      },
      // El interceptor ya avisa el error.
      error: () => {
        this.busy.set(false);
        this.confirming.set(false);
      },
    });
  }
}
