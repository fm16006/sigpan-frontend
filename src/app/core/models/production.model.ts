import { Id } from './api.model';

export interface RawMaterial {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly unidadMedida: string;
  readonly stock: number;
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
