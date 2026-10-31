import { Id } from './api.model';

export const DOCUMENT_TYPES = ['FACTURA', 'CCF'] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Readonly<Record<DocumentType, string>> = {
  FACTURA: 'Factura',
  CCF: 'Crédito fiscal (CCF)',
};

/** Largo máximo del N.º de documento de una compra (lo fija el backend). */
export const PURCHASE_DOCUMENT_MAX_LENGTH = 30;

export interface Supplier {
  readonly id: Id;
  readonly nombre: string;
  readonly contacto: string;
  readonly telefono: string;
  readonly email: string;
  readonly nit: string | null;
  readonly activo: boolean;
  /** Compras registradas a este proveedor. */
  readonly compras: number;
  /** "YYYY-MM-DD"; null si nunca se le compró. */
  readonly ultimaCompra: string | null;
}

/** Cuerpo de POST y PUT /proveedores. */
export interface SupplierDraft {
  readonly nombre: string;
  readonly contacto: string;
  readonly telefono: string;
  readonly email: string;
  readonly nit: string | null;
}

export interface PurchaseLine {
  readonly id: Id;
  /** Exactamente uno de los dos viene informado. */
  readonly materiaPrimaId: Id | null;
  readonly productoId: Id | null;
  /** Nombre del insumo o del producto. */
  readonly item: string;
  readonly unidad: string;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly subtotal: number;
  readonly lote?: string | null;
  readonly fechaVencimiento?: string | null;
  readonly unidadCompra?: string | null;
  readonly cantidadCompra?: number | null;
}

export interface Purchase {
  readonly id: Id;
  readonly proveedorId: Id;
  readonly proveedor: string;
  readonly tipoDocumento: DocumentType;
  readonly numeroDocumento: string;
  /** "YYYY-MM-DD". */
  readonly fecha: string;
  readonly total: number;
  /** ISO local, sin zona. */
  readonly creadaEn: string;
  readonly totalLineas: number;
  /** Vacío en el listado; completo en la ficha. */
  readonly lineas: readonly PurchaseLine[];
}

export interface PurchaseLineDraft {
  readonly materiaPrimaId?: Id;
  readonly productoId?: Id;
  readonly cantidad: number;
  readonly costoUnitario: number;
  /** HU-66: cantidad y costo en esa unidad; se convierten a la base. */
  readonly unidadId?: number;
  readonly lote?: string;
  readonly fechaVencimiento?: string;
}

/** Cuerpo de POST /compras. */
export interface PurchaseDraft {
  readonly proveedorId: Id;
  readonly tipoDocumento: DocumentType;
  readonly numeroDocumento: string;
  readonly fecha: string;
  readonly lineas: readonly PurchaseLineDraft[];
}

/** Una compra vista desde un insumo o un producto (`/compras/ultimas`). */
export interface ItemPurchase {
  readonly compraId: Id;
  readonly fecha: string;
  readonly proveedorId: Id;
  readonly proveedor: string;
  readonly tipoDocumento: DocumentType;
  readonly numeroDocumento: string;
  readonly cantidad: number;
  readonly costoUnitario: number;
  readonly subtotal: number;
}
