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

export const PRODUCT_TYPES = ['ELABORADO', 'REVENTA'] as const;

/** ELABORADO se produce con receta; REVENTA se compra ya hecho a un proveedor. */
export type ProductType = (typeof PRODUCT_TYPES)[number];

export const PRODUCT_TYPE_LABELS: Readonly<Record<ProductType, string>> = {
  ELABORADO: 'Elaborado',
  REVENTA: 'Reventa',
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
  /** Ausente solo en respuestas viejas: se trata como ELABORADO (ver `isResale`). */
  readonly tipo?: ProductType;
  /** Solo REVENTA: promedio ponderado de sus compras. */
  readonly costoPromedio?: number | null;
}

/** Los productos de reventa no llevan receta ni orden de producción: se reponen comprando. */
export function isResale(product: Pick<CatalogProduct, 'tipo'> | null | undefined): boolean {
  return product?.tipo === 'REVENTA';
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
  readonly tipo: ProductType;
}

export interface Category {
  readonly id: Id;
  readonly nombre: string;
}

export const IMAGE_TYPES: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

export const MAX_IMAGE_MB = 3;
