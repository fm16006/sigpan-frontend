import { Id } from './api.model';

export const ESPECIALIDADES = [
  'PAN_FRANCES',
  'PAN_DULCE',
  'REPOSTERIA',
  'PASTELERIA',
  'BOCADILLOS',
] as const;

export type Especialidad = (typeof ESPECIALIDADES)[number];

export const ESPECIALIDAD_LABELS: Readonly<Record<Especialidad, string>> = {
  PAN_FRANCES: 'Pan francés',
  PAN_DULCE: 'Pan dulce',
  REPOSTERIA: 'Repostería',
  PASTELERIA: 'Pastelería',
  BOCADILLOS: 'Bocadillos',
};

export interface CatalogProduct {
  readonly id: Id;
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
  readonly categoriaId: Id;
  readonly categoria: string;
  readonly unidadVenta: string;
  readonly especialidad: Especialidad;
  readonly alergenos: string | null;
  readonly activo: boolean;
  readonly imagenUrl: string | null;
  readonly stockMinimo: number | null;
  readonly disponible?: number | null;
  /** true cuando disponible <= 0. */
  readonly agotado: boolean;
}

export interface CatalogProductDraft {
  readonly codigo: string;
  readonly nombre: string;
  readonly descripcion: string;
  readonly precio: number;
  readonly categoriaId: Id;
  readonly stockMinimo: number;
  readonly unidadVenta: string;
  readonly especialidad: Especialidad;
  readonly alergenos: string | null;
}

export interface Category {
  readonly id: Id;
  readonly nombre: string;
}

export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_IMAGE_MB = 3;
