import { Id } from './api.model';

export interface CatalogProduct {
  readonly id: Id;
  readonly nombre: string;
  readonly descripcion: string | null;
  readonly precio: number;
  readonly categoriaId: Id;
  readonly categoria: string;
  readonly activo: boolean;
  readonly imagenUrl: string | null;
}

export interface CatalogProductDraft {
  readonly nombre: string;
  readonly descripcion: string;
  readonly precio: number;
  readonly categoriaId: Id;
}

export interface Category {
  readonly id: Id;
  readonly nombre: string;
}

export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_IMAGE_MB = 3;
