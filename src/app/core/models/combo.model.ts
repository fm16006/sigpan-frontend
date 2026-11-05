import { Id } from './api.model';

export interface Combo {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
  readonly activo: boolean;
  /** Categoría del combo en el punto de venta; null = va a «Combos». */
  readonly categoriaId?: Id | null;
  readonly categoria?: string | null;
}

export interface ComboDraft {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
  readonly categoriaId: Id | null;
}

/** Línea de un combo vendible en el punto de venta. */
export interface PosComboLine {
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
  /** Precio unitario regular del producto. */
  readonly precio: number;
}

/** Combo activo que se puede vender en el POS, con cuántos alcanzan con la existencia. */
export interface PosCombo {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
  readonly categoriaId: Id | null;
  readonly categoria: string | null;
  /** Combos completos que alcanzan con la existencia. */
  readonly disponible: number;
  readonly lineas: readonly PosComboLine[];
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
