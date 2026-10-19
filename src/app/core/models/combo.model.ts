import { Id } from './api.model';

export interface Combo {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
  readonly activo: boolean;
}

export interface ComboDraft {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
}

/** Producto que integra un combo, con su cantidad. */
export interface ComboLine {
  readonly id: Id;
  readonly comboId: Id;
  readonly combo: string;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
}

export interface ComboLineDraft {
  readonly comboId: Id;
  readonly productoId: Id;
  readonly cantidad: number;
}
