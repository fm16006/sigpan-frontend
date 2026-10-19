import { Id } from './api.model';

export interface RawMaterial {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly unidadMedida: string;
  readonly stockMinimo: number;
  readonly precio: number;
  readonly activo: boolean;
}

export interface Formula {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly cantidadProduccion: number;
  /** Merma esperada de proceso, en porcentaje (0 a 100). */
  readonly porcentajeMerma: number;
  readonly productoId: Id;
  readonly producto: string;
}

export interface FormulaDraft {
  readonly nombre: string;
  readonly descripcion: string;
  readonly cantidadProduccion: number;
  readonly porcentajeMerma: number;
  readonly productoId: Id;
}

export interface FormulaLine {
  readonly id: Id;
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
}

export interface FormulaLineDraft {
  readonly formulaId: Id;
  readonly materiaPrimaId: Id;
  readonly cantidad: number;
  readonly unidadMedida: string;
}

export interface FormulaCostLine {
  readonly materiaPrimaId: Id;
  readonly nombre: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
  readonly costoPromedio: number;
  readonly subtotal: number;
}

/** Costo calculado por el backend. El frontend solo lo muestra. */
export interface FormulaCost {
  readonly formulaId: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidadProduccion: number;
  readonly costoTotal: number;
  readonly costoUnitario: number;
  readonly insumos: readonly FormulaCostLine[];
}

export interface MaterialExplosionLine {
  readonly materiaPrimaId: Id;
  readonly nombre: string;
  readonly unidadMedida: string;
  /** Cantidad de la formula escalada, sin merma. */
  readonly cantidadFormula: number;
  /** Cantidad requerida: escalada, con merma y redondeada hacia arriba. */
  readonly cantidadRequerida: number;
  readonly existencia: number;
  readonly suficiente: boolean;
}

/** Explosion de materiales calculada por el backend. El frontend solo la muestra. */
export interface MaterialExplosion {
  readonly formulaId: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidadAProducir: number;
  readonly cantidadProduccion: number;
  readonly porcentajeMerma: number;
  readonly insumos: readonly MaterialExplosionLine[];
  readonly alcanza: boolean;
}

export const PRODUCTION_STATUSES = [
  'PENDIENTE',
  'CREADO',
  'PRODUCION',
  'TERMINADO',
  'CANCELADO',
] as const;

export type ProductionStatus = (typeof PRODUCTION_STATUSES)[number];

export const PRODUCTION_STATUS_LABELS: Readonly<Record<ProductionStatus, string>> = {
  PENDIENTE: 'Pendiente',
  CREADO: 'Creada',
  PRODUCION: 'En producción',
  TERMINADO: 'Terminada',
  CANCELADO: 'Cancelada',
};

export const CLOSED_PRODUCTION_STATUSES: readonly ProductionStatus[] = ['TERMINADO', 'CANCELADO'];

export interface Production {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly formulaId: Id;
  readonly formula: string;
  readonly cantidad: number;
  readonly estado: ProductionStatus;
  readonly fecha: string;
  /** "YYYY-MM-DD". */
  readonly fechaPlanificada: string;
  readonly comentario: string | null;
}

export interface ProductionDraft {
  readonly productoId: Id;
  readonly formulaId: Id;
  readonly cantidad: number;
  /** "YYYY-MM-DD", hoy o futura. */
  readonly fechaPlanificada: string;
  readonly comentario: string;
}

export interface Promotion {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly tipoDescuento: string;
  readonly valorDescuento: number;
  readonly fechaInicio: string | null;
  readonly fechaFin: string | null;
  readonly activo: boolean;
}
