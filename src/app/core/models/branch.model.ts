import { Id } from './api.model';

/** Caja registradora de una sucursal. */
export interface Register {
  readonly id: Id;
  readonly sucursalId: Id;
  readonly nombre: string;
  readonly codigo: string;
  readonly activo: boolean;
}

export interface RegisterDraft {
  readonly nombre: string;
  readonly codigo: string;
  readonly activo?: boolean;
}

/** Sucursal de la panadería con sus cajas. */
export interface Branch {
  readonly id: Id;
  readonly nombre: string;
  readonly codigo: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly horario: string | null;
  readonly activo: boolean;
  /** Usuarios activos asignados. */
  readonly cantidadUsuarios: number;
  /** Todas las cajas (en "mi sucursal", solo las activas). */
  readonly cajas: readonly Register[];
}

export interface BranchDraft {
  readonly nombre: string;
  readonly codigo: string;
  readonly direccion: string | null;
  readonly telefono: string | null;
  readonly horario: string | null;
  readonly activo?: boolean;
}
