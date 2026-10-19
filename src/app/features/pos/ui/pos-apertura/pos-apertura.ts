import { Component, computed, inject, input, output, signal } from '@angular/core';
import { BUSINESS_INFO } from '../../../../core/config/business.config';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { APERTURA_DENOMINATIONS, aperturaTotal, denominationLabel } from '../../pos-logic';
import { CashRegisterStore } from '../../services/cash-register.store';

const WHEN_FORMAT = new Intl.DateTimeFormat('es-SV', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Abrir caja: vista que ve el cajero mientras la caja está cerrada. Cuenta el fondo
 * inicial y abre el turno; el turno se guarda en el navegador hasta que el backend lo
 * soporte (HU-38).
 */
@Component({
  selector: 'app-pos-apertura',
  imports: [MoneyPipe, StatusChip],
  templateUrl: './pos-apertura.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200' },
})
export class PosApertura {
  private readonly register = inject(CashRegisterStore);

  readonly cashier = input('');
  /** El usuario tiene enlaces del panel: se muestra "Ir al panel". */
  readonly hasPanel = input(false);
  readonly logout = output<void>();

  protected readonly caja = BUSINESS_INFO.caja;
  protected readonly denominations = APERTURA_DENOMINATIONS;
  protected readonly label = denominationLabel;
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly note = signal('');
  protected readonly fondo = computed(() => aperturaTotal(this.counts()));
  protected readonly when = WHEN_FORMAT.format(new Date());
  protected readonly previous = this.register.ultimoCierre;

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
    this.register.abrir(this.fondo(), this.note());
  }
}
