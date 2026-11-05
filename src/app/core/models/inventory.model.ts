import { Id } from './api.model';

export const STOCK_KINDS = ['materia-prima', 'producto'] as const;

export type StockKind = (typeof STOCK_KINDS)[number];

export const MOVEMENT_TYPES = ['ENTRADA', 'SALIDA'] as const;

export type MovementType = (typeof MOVEMENT_TYPES)[number];

export interface RawMaterialStock {
  readonly id: Id;
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly cantidad: number;
  readonly cantidadMinima?: number | null;
  readonly fechaActualizacion: string | null;
}

export interface ProductStock {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
  readonly fechaActualizacion: string | null;
}

/** Largo máximo del N.º de documento que pide el backend. */
export const DOCUMENTO_MAX_LENGTH = 50;

export interface StockMovement {
  readonly id: Id;
  readonly inventarioId: Id;
  /** Que insumo movio; el backend lo informa en `/movimientos-inventario/materia-prima`. */
  readonly materiaPrimaId?: Id;
  readonly materiaPrima?: string;
  readonly tipo: MovementType;
  readonly cantidad: number;
  readonly fecha: string;
  readonly motivo: string | null;
  readonly documento: string | null;
  readonly costoInicial: number | null;
  readonly costoFinal: number | null;
}

/** Movimiento de producto: el backend no guarda documento en este tipo. */
export interface ProductMovement {
  readonly id: Id;
  readonly inventarioId: Id;
  readonly documento?: string | null;
  readonly productoId: Id;
  readonly producto: string;
  readonly tipo: MovementType;
  readonly cantidad: number;
  readonly fecha: string;
  readonly motivo: string | null;
  readonly costoInicial: number | null;
  readonly costoFinal: number | null;
}

export interface StockMovementDraft {
  readonly inventarioId: Id;
  readonly tipo: MovementType;
  readonly cantidad: number;
  readonly motivo: string;
  /** Obligatorio cuando tipo es ENTRADA. */
  readonly documento?: string;
  readonly costoInicial?: number;
  /** Materia prima: AJUSTE o MERMA (HU-14). */
  readonly clase?: string;
}

export interface StockRow {
  readonly kind: StockKind;
  readonly itemId: Id;
  readonly inventarioId: Id | null;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly unidad: string;
  readonly cantidad: number;
  readonly minimo: number;
  readonly fechaActualizacion: string | null;
}

/** El artículo tiene inventario habilitado (puede recibir movimientos). */
export function hasInventory(row: StockRow): boolean {
  return row.inventarioId !== null;
}

export function isLowStock(row: StockRow): boolean {
  return hasInventory(row) && Number(row.cantidad) <= Number(row.minimo);
}
