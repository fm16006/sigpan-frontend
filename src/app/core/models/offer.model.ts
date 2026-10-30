import { Id } from './api.model';

export type OfferKind = 'DESCUENTO' | 'LIQUIDACION' | 'COMBO' | 'ESCALA';

export interface Offer {
  readonly tipo: OfferKind;
  readonly regla: string;
  readonly etiqueta: string;
  readonly precio: number;
}

/** HU-30: ofertas de un producto, iguales en tienda y punto de venta. */
export interface ProductOffers {
  readonly productoId: Id;
  readonly precioOriginal: number;
  /** Precio de una unidad con el descuento directo; nulo si solo hay combo o escala. */
  readonly precioOferta: number | null;
  readonly ofertas: readonly Offer[];
}
