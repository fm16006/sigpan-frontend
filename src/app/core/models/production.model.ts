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
  readonly productoId: Id;
  readonly producto: string;
}

export interface FormulaLine {
  readonly id: Id;
  readonly materiaPrima: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
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
  readonly comentario: string | null;
}

export interface ProductionDraft {
  readonly productoId: Id;
  readonly formulaId: Id;
  readonly cantidad: number;
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
