import { Component, computed, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import { Branch } from '../../../../core/models/branch.model';
import { Auth } from '../../../../core/services/auth';
import { CashCut, Sale } from '../../../../core/models/order.model';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderService } from '../../../storefront/services/order.service';
import { placeLabel } from '../../../branches/branch-utils';
import { BranchService } from '../../../branches/services/branch.service';
import { ARQUEO_DENOMINATIONS, arqueoTotal, denominationLabel } from '../../pos-logic';
import { CashRegisterStore } from '../../services/cash-register.store';
import { valueOr } from '../../../../core/http/resource-value';

/**
 * Cierre de caja. Lo que el backend entrega hoy (corte del día, filtrable por sucursal y caja) se muestra de verdad; el
 * arqueo se cuenta en el navegador y el turno vive en `CashRegisterStore`. Método de pago,
 * retiros y anulación no existen en el backend: se muestran como "Próximamente" con su
 * historia de usuario.
 */
@Component({
  selector: 'app-pos-caja',
  imports: [DatePipe, MoneyPipe, StatusChip, ConfirmDialog],
  templateUrl: './pos-caja.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200' },
})
export class PosCaja {
  private readonly orders = inject(OrderService);
  private readonly register = inject(CashRegisterStore);
  private readonly branches = inject(BranchService);
  private readonly auth = inject(Auth);

  readonly cashier = input('');
  readonly back = output<void>();
  /** Se cerró el turno: la pantalla vuelve a "Abrir caja". */
  readonly closed = output<void>();

  protected readonly turno = this.register.turno;
  /** El administrador puede ver cualquier sucursal; el cajero queda en la suya. */
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  protected readonly place = computed(() => {
    const lugar = this.register.lugar();
    return placeLabel(lugar?.sucursal ?? this.auth.user()?.sucursal, lugar?.caja ?? 'Caja');
  });

  /** Sucursal del usuario con sus cajas activas (siempre disponible para el cajero). */
  private readonly mine = httpResource<Branch>(() => this.branches.mineUrl());
  private readonly allBranches = httpResource<Branch[]>(
    () => (this.isAdmin ? this.branches.listUrl() : undefined),
    { defaultValue: [] },
  );
  protected readonly branchOptions = computed<readonly Branch[]>(() => {
    if (this.isAdmin) return valueOr(this.allBranches, []);
    const own = valueOr<Branch | undefined>(this.mine, undefined);
    return own ? [own] : [];
  });

  /** Filtros del corte: por defecto, la sucursal y la caja del turno abierto. */
  protected readonly branchFilter = signal<Id | null>(
    this.register.lugar()?.sucursalId ?? this.auth.user()?.sucursalId ?? null,
  );
  protected readonly registerFilter = signal<Id | null>(this.register.lugar()?.cajaId ?? null);
  protected readonly registerOptions = computed(
    () => this.branchOptions().find((branch) => branch.id === this.branchFilter())?.cajas ?? [],
  );
  protected readonly branchName = computed(
    () => this.branchOptions().find((branch) => branch.id === this.branchFilter())?.nombre ?? null,
  );
  protected readonly scope = computed(() => {
    const registerName = this.registerOptions().find((item) => item.id === this.registerFilter())?.nombre;
    return placeLabel(this.branchName() ?? 'Todas las sucursales', registerName ?? 'todas las cajas');
  });
  protected readonly denominations = ARQUEO_DENOMINATIONS;
  protected readonly cutDate = signal(todayIso());
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly counted = computed(() => arqueoTotal(this.counts()));
  protected readonly confirmOpen = signal(false);

  protected readonly cut = httpResource<CashCut>(() =>
    this.orders.cashCutUrl(this.cutDate(), {
      sucursalId: this.branchFilter(),
      cajaId: this.registerFilter(),
    }),
  );
  protected readonly cutValue = computed(() => valueOr(this.cut, undefined));

  protected count(value: number): number {
    return this.counts()[value] ?? 0;
  }

  protected adjust(value: number, delta: number): void {
    this.counts.update((counts) => ({ ...counts, [value]: Math.max(0, (counts[value] ?? 0) + delta) }));
  }

  protected readonly label = denominationLabel;

  protected pickBranch(value: string): void {
    this.branchFilter.set(value === '' ? null : Number(value));
    // Las cajas son de una sucursal: al cambiarla, el filtro de caja ya no aplica.
    this.registerFilter.set(null);
  }

  protected pickRegister(value: string): void {
    this.registerFilter.set(value === '' ? null : Number(value));
  }

  /** "Sucursal · Caja" de una venta; sin sucursal ya elegida se aclara de cuál es. */
  protected whereOf(venta: Sale): string {
    return placeLabel(this.branchFilter() === null ? venta.sucursal : null, venta.caja);
  }

  protected isCancelled(estado: string): boolean {
    return estado === 'CANCELADO';
  }

  protected closeRegister(): void {
    this.confirmOpen.set(false);
    this.register.cerrar(this.counted());
    this.closed.emit();
  }
}
