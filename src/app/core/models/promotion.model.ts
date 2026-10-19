import { Id } from './api.model';

export const PROMOTION_TYPES = ['PORCENTAJE', 'MONTO'] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PROMOTION_TYPE_LABELS: Readonly<Record<PromotionType, string>> = {
  PORCENTAJE: 'Porcentaje',
  MONTO: 'Monto fijo por unidad',
};

export interface Promotion {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly tipoDescuento: PromotionType;
  readonly valorDescuento: number;
  /** "YYYY-MM-DD" */
  readonly fechaInicio: string | null;
  /** "YYYY-MM-DD" */
  readonly fechaFin: string | null;
  readonly prioridad: number;
  readonly activo: boolean;
}

/** Cuerpo de alta y edición. Con `mes` (YYYY-MM) el backend ignora las fechas. */
export interface PromotionDraft {
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly tipoDescuento: PromotionType;
  readonly valorDescuento: number;
  readonly mes: string | null;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly prioridad: number;
}

/** Vínculo promoción-producto. Una promoción con un producto es individual; con varios, es bloque. */
export interface PromotionProductLink {
  readonly id: Id;
  readonly promocionId: Id;
  readonly promocion: string;
  readonly productoId: Id;
  readonly producto: string;
}
