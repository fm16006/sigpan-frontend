import { Id } from './api.model';

/** HU-28: descuento por sobreproducción en un horario. */
export interface Liquidation {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  /** Unidades que se quieren conservar; lo que sobra pasa a liquidación. */
  readonly umbral: number;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly porcentaje: number;
  readonly prioridad: number;
  readonly activo: boolean;
  readonly vigente: boolean;
  readonly existencia: number | null;
}

export interface LiquidationDraft {
  readonly productoId: Id | null;
  readonly umbral: number;
  readonly horaInicio: string;
  readonly horaFin: string;
  readonly porcentaje: number;
  readonly prioridad: number;
  readonly activo: boolean;
}
