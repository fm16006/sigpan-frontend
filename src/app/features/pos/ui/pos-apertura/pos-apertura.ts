import { Component, computed, input, output, signal } from '@angular/core';
import { BUSINESS_INFO } from '../../../../core/config/business.config';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { APERTURA_DENOMINATIONS, aperturaTotal, denominationLabel } from '../../pos-logic';

const WHEN_FORMAT = new Intl.DateTimeFormat('es-SV', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});

/**
 * Abrir caja. El conteo del fondo inicial funciona en el navegador; guardar el turno y
 * leer el turno anterior necesitan backend (HU-38), así que esas partes quedan
 * deshabilitadas. No bloquea la venta mientras tanto.
 */
@Component({
  selector: 'app-pos-apertura',
  imports: [MoneyPipe, StatusChip],
  templateUrl: './pos-apertura.html',
  host: { class: 'flex min-h-0 flex-1 flex-col overflow-y-auto bg-base-200' },
})
export class PosApertura {
  readonly cashier = input('');
  readonly back = output<void>();
  readonly closing = output<void>();

  protected readonly caja = BUSINESS_INFO.caja;
  protected readonly denominations = APERTURA_DENOMINATIONS;
  protected readonly label = denominationLabel;
  protected readonly counts = signal<Readonly<Record<number, number>>>({});
  protected readonly fondo = computed(() => aperturaTotal(this.counts()));
  protected readonly when = WHEN_FORMAT.format(new Date());

  protected count(value: number): number {
    return this.counts()[value] ?? 0;
  }

  protected adjust(value: number, delta: number): void {
    this.counts.update((counts) => ({ ...counts, [value]: Math.max(0, (counts[value] ?? 0) + delta) }));
  }
}
