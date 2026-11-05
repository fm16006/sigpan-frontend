import { Id } from './api.model';

/** Caja registradora de la panadería. */
export interface Register {
  readonly id: Id;
  readonly nombre: string;
  readonly codigo: string;
  readonly activo: boolean;
}

/**
 * Respuesta de `GET /sucursales/mi-sucursal`: la sucursal única (interna, no se elige ni se muestra)
 * con sus cajas activas. El punto de venta solo usa las cajas.
 */
export interface RegisterBranch {
  readonly id: Id;
  readonly nombre: string;
  readonly codigo: string;
  readonly cajas: readonly Register[];
}

/** Respuesta de `GET /cajas`: toda caja, activa o no, y quién la tiene abierta. Solo administración. */
export interface RegisterAdmin {
  readonly id: Id;
  readonly nombre: string;
  readonly codigo: string;
  readonly activo: boolean;
  readonly ocupada: boolean;
  readonly turnoId: Id | null;
  readonly usuario: string | null;
}
