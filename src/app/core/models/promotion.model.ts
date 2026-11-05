import { Id } from './api.model';

export const PROMOTION_TYPES = ['PORCENTAJE', 'MONTO'] as const;

export type PromotionType = (typeof PROMOTION_TYPES)[number];

export const PROMOTION_TYPE_LABELS: Readonly<Record<PromotionType, string>> = {
  PORCENTAJE: 'Porcentaje',
  MONTO: 'Monto fijo por unidad',
};

/** A qué productos alcanza una promoción (HU-64). */
export const PROMOTION_SCOPES = ['TODOS', 'CATEGORIAS', 'PRODUCTOS'] as const;

export type PromotionScope = (typeof PROMOTION_SCOPES)[number];

export const PROMOTION_SCOPE_LABELS: Readonly<Record<PromotionScope, string>> = {
  TODOS: 'Todos los productos',
  CATEGORIAS: 'Por categoría',
  PRODUCTOS: 'Productos específicos',
};

export const PROMOTION_SCOPE_HINTS: Readonly<Record<PromotionScope, string>> = {
  TODOS: 'Incluye también los productos que se agreguen al catálogo más adelante.',
  CATEGORIAS: 'Incluye también los productos que se agreguen después a esas categorías.',
  PRODUCTOS: 'Solo los productos que elijas uno por uno.',
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
  /** Ausente solo en respuestas viejas: se trata como PRODUCTOS. */
  readonly alcance?: PromotionScope;
  /** Categorías alcanzadas (solo con alcance CATEGORIAS) y sus nombres, en el mismo orden. */
  readonly categoriaIds?: readonly Id[];
  readonly categorias?: readonly string[];
  /** Productos elegidos (solo con alcance PRODUCTOS). */
  readonly productoIds?: readonly Id[];
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
  readonly alcance: PromotionScope;
  /** Solo se usan con alcance CATEGORIAS. */
  readonly categoriaIds: readonly Id[];
  /** Solo se usan con alcance PRODUCTOS. */
  readonly productoIds: readonly Id[];
}

/** Vínculo promoción-producto. `id` es null en los productos alcanzados por categoría o por «todos». */
export interface PromotionProductLink {
  readonly id: Id | null;
  readonly promocionId: Id;
  readonly promocion: string;
  readonly productoId: Id;
  readonly producto: string;
}
