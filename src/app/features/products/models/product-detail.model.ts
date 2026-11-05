import { Id } from '../../../core/models/api.model';
import { MovementType } from '../../../core/models/inventory.model';

/** Inventario de un producto, tal como lo devuelve /inventarios/producto/:productoId. */
export interface ProductInventory {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
  readonly cantidadMinima: number | null;
  readonly fechaActualizacion: string | null;
}

/** Movimiento de inventario de un producto (el backend no informa documento ni usuario). */
export interface ProductMovement {
  readonly id: Id;
  readonly inventarioId: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly tipo: MovementType;
  readonly cantidad: number;
  /** ISO local, sin zona. */
  readonly fecha: string;
  readonly motivo: string | null;
  readonly costoInicial: number | null;
  readonly costoFinal: number | null;
  /** HU-21: PRODUCCION o MERMA_PROCESO si lo movió una orden; MERMA o AJUSTE si fue manual. */
  readonly clase?: string | null;
}
