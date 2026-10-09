import { Id } from './api.model';

export const PRODUCT_CATEGORIES = ['PAN', 'PASTELERIA', 'BEBIDA', 'TEMPORADA'] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export interface Product {
  readonly id: Id;
  readonly sku: string;
  readonly name: string;
  readonly description: string;
  readonly category: ProductCategory;
  /** Precio unitario en la moneda base del negocio. */
  readonly price: number;
  readonly imageUrl: string | null;
  readonly available: boolean;
}

/** Campos editables; el id lo asigna el backend. */
export type ProductDraft = Omit<Product, 'id'>;

export const PRODUCT_CATEGORY_LABELS: Readonly<Record<ProductCategory, string>> = {
  PAN: 'Panadería',
  PASTELERIA: 'Pastelería',
  BEBIDA: 'Bebidas',
  TEMPORADA: 'Temporada',
};
