import { Id } from './api.model';

/** Tramo de mayoreo: desde `cantidadMinima` unidades, cada una cuesta `precioUnitario`. */
export interface PriceScale {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidadMinima: number;
  readonly precioUnitario: number;
  readonly activo: boolean;
}

export interface PriceScaleDraft {
  readonly productoId: Id;
  readonly cantidadMinima: number;
  readonly precioUnitario: number;
  readonly activo: boolean;
}
