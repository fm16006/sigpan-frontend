import { Component, computed, input } from '@angular/core';
import { taxRateLabel } from '../../../core/models/tax.model';
import { Quote } from '../../../core/models/quote.model';
import { MoneyPipe } from '../../pipes/money.pipe';

/** Lo mínimo del desglose que hace falta para mostrar el IVA de una cotización. */
export type IvaLike = Pick<Quote, 'aplicaIva' | 'ivaIncluido' | 'tasaIva' | 'iva'>;

/**
 * Línea del IVA en un resumen de compra (HU-36). Muestra lo que calculó el servidor: con IVA
 * incluido es informativo («IVA incluido (13 %)»); con IVA no incluido se suma al precio
 * («IVA (13 %)»). Si la empresa no aplica IVA no muestra nada.
 */
@Component({
  selector: 'app-iva-line',
  imports: [MoneyPipe],
  host: { class: 'contents' },
  template: `
    @if (visible(); as tax) {
      <div class="flex justify-between text-base-content/75" data-testid="iva-line">
        <span>{{ tax.ivaIncluido ? 'IVA incluido' : 'IVA' }} ({{ rate() }})</span>
        <span class="tabular-nums">{{ tax.ivaIncluido ? '' : '+' }}{{ tax.iva | money }}</span>
      </div>
    }
  `,
})
export class IvaLine {
  readonly tax = input<IvaLike | null | undefined>(null);

  protected readonly visible = computed(() => {
    const tax = this.tax();
    return tax?.aplicaIva ? tax : null;
  });
  protected readonly rate = computed(() => taxRateLabel(this.tax()?.tasaIva ?? 0));
}
