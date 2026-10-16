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
  readonly fechaActualizacion: string | null;
}

export interface ProductStock {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
  readonly fechaActualizacion: string | null;
}

export interface StockMovement {
  readonly id: Id;
  readonly inventarioId: Id;
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
  readonly costoInicial?: number;
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

export function isLowStock(row: StockRow): boolean {
  return row.inventarioId !== null && Number(row.cantidad) <= Number(row.minimo);
}
