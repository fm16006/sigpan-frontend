import { Component, DestroyRef, PLATFORM_ID, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { Id } from '../../../../core/models/api.model';
import { Register, RegisterBranch } from '../../../../core/models/branch.model';
import { CashShift, RegisterStatus } from '../../../../core/models/order.model';
import { Auth } from '../../../../core/services/auth';
import { CashierHandover } from '../../../cash-registers/ui/cashier-handover/cashier-handover';
import { CloseShiftDrawer } from '../../../cash-registers/ui/close-shift-drawer/close-shift-drawer';
import { RegisterCard } from '../../../cash-registers/ui/register-card/register-card';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { APERTURA_DENOMINATIONS, aperturaTotal, denominationLabel } from '../../pos-logic';
import { activeRegisters } from '../../register-utils';
import { CashRegisterStore } from '../../services/cash-register.store';
import { RegisterService } from '../../services/register.service';

const WHEN_FORMAT = new Intl.DateTimeFormat('es-SV', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Abrir caja: vista que ve el cajero mientras la caja está cerrada. Deja elegir la caja si hay
 * más de una activa (con una sola, queda elegida), cuenta el fondo inicial y abre el turno; el
 * turno queda en el servidor (HU-38).
 */
@Component({
  selector: 'app-pos-apertura',
  imports: [MoneyPipe, StatusChip, RegisterCard, CashierHandover, CloseShiftDrawer],
  templateUrl: './pos-apertura.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200' },
})
export class PosApertura {
  private readonly register = inject(CashRegisterStore);
  private readonly registerService = inject(RegisterService);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(Auth);

  readonly cashier = input('');
  /** El usuario tiene enlaces del panel: se muestra "Ir al panel". */
  readonly hasPanel = input(false);
  readonly panel = output<void>();
  readonly logout = output<void>();

  /** Cajas activas de la panadería. */
  protected readonly source = httpResource<RegisterBranch>(() => this.registerService.registersUrl());
  protected readonly sourceValue = computed(() =>
    valueOr<RegisterBranch | undefined>(this.source, undefined),
  );
  protected readonly registers = computed(() => activeRegisters(this.sourceValue()));
  /** El backend responde 404 si la panadería no tiene dónde cobrar configurado. */
  protected readonly notFound = computed(() => {
    const error = this.source.error() as { status?: number } | undefined;
    return error?.status === 404;
  });

  /**
   * Con una sola caja queda elegida; con varias se parte de la que ya se eligió o de la última que
   * usó el cajero, y si esa está en uso por otro, de la primera libre.
   */
  protected readonly selectedId = linkedSignal<
    { list: readonly Register[]; busy: ReadonlySet<Id> },
    Id | null
  >({
    source: () => ({ list: this.registers(), busy: this.busyIds() }),
    computation: ({ list, busy }, previous) => {
      if (list.length === 1) return list[0].id;
      const chosen = previous?.value ?? null;
      if (chosen !== null && list.some((item) => item.id === chosen)) return chosen;
      const last = this.previous()?.lugar?.cajaId ?? null;
      if (last !== null && list.some((item) => item.id === last) && !busy.has(last)) return last;
      return list.find((item) => !busy.has(item.id))?.id ?? null;
    },
  });
  protected readonly selected = computed(
    () => this.registers().find((item) => item.id === this.selectedId()) ?? null,
  );
  protected readonly place = computed(() => this.selected()?.nombre ?? 'Elegí una caja');

  /**
   * HU-68: quién tiene cada caja. Si la elegida tiene el turno abierto de otro usuario (el propio
   * ya habría pasado la caja a "abierta"), no se puede abrir y se dice quién la tiene.
   */
  protected readonly statuses = httpResource<RegisterStatus[]>(() => this.api.url(API_ENDPOINTS.turnos.cajas), {
    defaultValue: [],
  });
  /** Cajas con el turno abierto de alguien (el propio ya habría pasado el POS a vender). */
  protected readonly busyIds = computed<ReadonlySet<Id>>(
    () => new Set(valueOr(this.statuses, []).filter((status) => status.ocupada).map((status) => status.cajaId)),
  );
  /** Quién tiene una caja ocupada, para marcarla en la lista. */
  protected busyBy(id: Id): string | null {
    return valueOr(this.statuses, []).find((status) => status.cajaId === id && status.ocupada)?.usuario ?? null;
  }
  /** Hay alguna caja libre a la cual cambiarse. */
  protected readonly anyFree = computed(() => this.registers().some((item) => !this.busyIds().has(item.id)));
  protected readonly occupied = computed(() => {
    const id = this.selectedId();
    return valueOr(this.statuses, []).find((status) => status.cajaId === id && status.ocupada) ?? null;
  });
  /** Administración destraba la caja desde aquí: la pasa a otro cajero (o a sí misma) o la cierra. */
  protected readonly canManage = this.auth.hasAnyRole(['ADMINISTRADOR']);
  protected readonly handover = signal<CashShift | null>(null);
  protected readonly closingShift = signal<CashShift | null>(null);
  protected readonly canOpen = computed(
    () => this.sourceValue() !== undefined && this.selected() !== null && this.occupied() === null,
  );
  protected readonly previous = this.register.ultimoCierre;
  protected readonly denominations = APERTURA_DENOMINATIONS;
  protected readonly label = denominationLabel;
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly note = signal('');
  protected readonly fondo = computed(() => aperturaTotal(this.counts()));
  protected readonly when = WHEN_FORMAT.format(new Date());
  protected readonly opening = signal(false);

  constructor() {
    // Otro cajero puede abrir o cerrar una caja mientras esta pantalla está abierta.
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.statuses.reload(), 20_000);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected count(value: number): number {
    return this.counts()[value] ?? 0;
  }

  protected adjust(value: number, delta: number): void {
    this.counts.update((counts) => ({ ...counts, [value]: Math.max(0, (counts[value] ?? 0) + delta) }));
  }

  protected whenOf(iso: string): string {
    return WHEN_FORMAT.format(new Date(iso));
  }

  /**
   * La caja cambió de manos o se cerró: se vuelve a leer quién la tiene y el turno propio (si la
   * administración se la pasó a sí misma, el punto de venta pasa a vender).
   */
  protected registerChanged(): void {
    this.handover.set(null);
    this.closingShift.set(null);
    this.statuses.reload();
    this.register.refrescar();
  }

  protected open(): void {
    const caja = this.selected();
    if (!this.sourceValue() || !caja) return;
    this.opening.set(true);
    this.register.abrir(this.fondo(), this.note(), { cajaId: caja.id, caja: caja.nombre }).subscribe({
      next: () => this.opening.set(false),
      error: () => {
        this.opening.set(false);
        this.register.refrescar();
        this.statuses.reload();
      },
    });
  }
}
