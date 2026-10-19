import { Id } from './api.model';

/** Categoría tal como la administra el backoffice: con su estado y cuántos productos y combos la usan. */
export interface ManagedCategory {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly activo: boolean;
  /** Productos de la categoría (activos o no). */
  readonly productos: number;
  readonly productosActivos: number;
  /** Combos de la categoría (activos o no). */
  readonly combos: number;
  readonly combosActivos: number;
}

export interface CategoryDraft {
  readonly nombre: string;
  readonly descripcion: string | null;
}
