import { Component, computed, inject, input, linkedSignal, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { valueOr } from '../../../../core/http/resource-value';
import { Id } from '../../../../core/models/api.model';
import { Register, RegisterBranch } from '../../../../core/models/branch.model';
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
 * turno se guarda en el navegador hasta que el backend lo soporte (HU-38).
 */
@Component({
  selector: 'app-pos-apertura',
  imports: [MoneyPipe, StatusChip],
  templateUrl: './pos-apertura.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200' },
})
export class PosApertura {
  private readonly register = inject(CashRegisterStore);
  private readonly registerService = inject(RegisterService);

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

  /** Con una sola caja queda elegida; con varias se parte de la última que usó el cajero. */
  protected readonly selectedId = linkedSignal<readonly Register[], Id | null>({
    source: this.registers,
    computation: (list, previous) => {
      if (list.length === 1) return list[0].id;
      const keep = previous?.value ?? this.previous()?.lugar?.cajaId ?? null;
      return keep !== null && list.some((item) => item.id === keep) ? keep : null;
    },
  });
  protected readonly selected = computed(
    () => this.registers().find((item) => item.id === this.selectedId()) ?? null,
  );
  protected readonly place = computed(() => this.selected()?.nombre ?? 'Elegí una caja');
  protected readonly canOpen = computed(() => this.sourceValue() !== undefined && this.selected() !== null);
  protected readonly previous = this.register.ultimoCierre;
  protected readonly denominations = APERTURA_DENOMINATIONS;
  protected readonly label = denominationLabel;
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly note = signal('');
  protected readonly fondo = computed(() => aperturaTotal(this.counts()));
  protected readonly when = WHEN_FORMAT.format(new Date());

  protected count(value: number): number {
    return this.counts()[value] ?? 0;
  }

  protected adjust(value: number, delta: number): void {
    this.counts.update((counts) => ({ ...counts, [value]: Math.max(0, (counts[value] ?? 0) + delta) }));
  }

  protected whenOf(iso: string): string {
    return WHEN_FORMAT.format(new Date(iso));
  }

  protected open(): void {
    const caja = this.selected();
    if (!this.sourceValue() || !caja) return;
    this.register.abrir(this.fondo(), this.note(), { cajaId: caja.id, caja: caja.nombre });
  }
}
