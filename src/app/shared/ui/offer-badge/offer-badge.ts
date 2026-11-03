import { Component, input } from '@angular/core';
import { OfferKind, ProductOffers } from '../../../core/models/offer.model';

export const OFFER_LABELS: Readonly<Record<OfferKind, string>> = {
  DESCUENTO: 'Oferta',
  LIQUIDACION: 'Liquidación',
  COMBO: 'Combo',
  ESCALA: 'Mayoreo',
};

const TONES: Readonly<Record<OfferKind, string>> = {
  DESCUENTO: 'badge-success',
  LIQUIDACION: 'badge-error',
  COMBO: 'badge-info',
  ESCALA: 'badge-secondary',
};

/** Señal de oferta del producto (HU-30); la usan la tienda y el punto de venta. */
@Component({
  selector: 'app-offer-badge',
  host: { class: 'flex flex-wrap gap-1' },
  template: `
    @for (offer of offers().ofertas; track offer.regla) {
      <span
        class="badge {{ tones[offer.tipo] }}"
        [class.badge-sm]="size() === 'sm'"
        [class.badge-xs]="size() === 'xs'"
        [title]="offer.etiqueta"
      >
        {{ labels[offer.tipo] }}
      </span>
    }
  `,
})
export class OfferBadge {
  readonly offers = input.required<ProductOffers>();
  /** El punto de venta usa la insignia chica: el mosaico de producto tiene poco espacio. */
  readonly size = input<'sm' | 'xs'>('sm');

  protected readonly labels = OFFER_LABELS;
  protected readonly tones = TONES;
}
