import { Id } from '../../../core/models/api.model';
import { CatalogProduct } from '../../../core/models/catalog.model';

export interface PosLine {
  readonly product: CatalogProduct;
  readonly quantity: number;
}

export type DocumentKind = 'TICKET' | 'CCF' | 'FACTURA';

export type PaymentMethod = 'EFECTIVO' | 'TARJETA';

/** Lo que se ofrece en el cobro: Mixto se muestra pero todavía no se puede elegir. */
export type PaymentOptionId = PaymentMethod | 'MIXTO';

export interface CheckoutOption<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly hint: string;
  readonly available: boolean;
}

export const DOCUMENT_OPTIONS: readonly CheckoutOption<DocumentKind>[] = [
  { id: 'TICKET', label: 'Ticket', hint: 'Consumidor final', available: true },
  { id: 'CCF', label: 'Crédito fiscal', hint: 'Próximamente', available: false },
  { id: 'FACTURA', label: 'Factura', hint: 'Próximamente', available: false },
];

export const PAYMENT_OPTIONS: readonly CheckoutOption<PaymentOptionId>[] = [
  { id: 'EFECTIVO', label: 'Efectivo', hint: 'Billetes y monedas', available: true },
  { id: 'TARJETA', label: 'Tarjeta', hint: 'Débito o crédito', available: true },
  { id: 'MIXTO', label: 'Mixto', hint: 'Próximamente', available: false },
];

/** Billetes del cobro en efectivo; "Exacto" y "Borrar" van aparte. */
export const CASH_SHORTCUTS = [1, 5, 10, 20] as const;

export interface ReceiptLine {
  readonly cantidad: number;
  readonly descripcion: string;
  /** Precio publicado (con IVA si la venta lo llevaba incluido). */
  readonly precio: number;
  /** Precio por cantidad, antes de descuentos. */
  readonly importe: number;
  /** Línea exenta de IVA cuando se vendió. */
  readonly exento?: boolean;
  /** Precio unitario sin IVA (4 decimales), para el comprobante de crédito fiscal. */
  readonly precioSinIva?: number;
  /** Importe de la línea sin IVA, para el comprobante de crédito fiscal. */
  readonly importeSinIva?: number;
}

/** Desglose del IVA guardado con la venta. El ticket nunca lo recalcula con la configuración vigente. */
export interface ReceiptTax {
  readonly aplicaIva: boolean;
  readonly ivaIncluido: boolean;
  /** Porcentaje con el que se calculó la venta (13 = 13 %). */
  readonly tasa: number;
  readonly ventasGravadas: number;
  readonly ventasExentas: number;
  readonly iva: number;
}

export interface CardRead {
  readonly uid: string;
  readonly tipo: string;
}

export type CardBrand = 'VISA' | 'MASTERCARD' | 'AMEX';

export interface CardPayment {
  readonly uid: string;
  readonly marca: CardBrand;
  readonly ultimos: string;
  readonly autorizacion: string;
}

export interface Receipt {
  readonly numero: Id;
  readonly fecha: Date;
  readonly cajero: string;
  /** Sucursal y caja donde se cobró (vienen de la venta registrada). */
  readonly sucursal: string;
  readonly caja: string;
  readonly documento: DocumentKind;
  readonly metodo: PaymentMethod;
  readonly lineas: readonly ReceiptLine[];
  /** Suma de los importes de las líneas, antes de descuentos. */
  readonly subtotal: number;
  readonly descuento: number;
  readonly impuestos: ReceiptTax;
  /** Total a pagar: ya incluye el IVA. */
  readonly total: number;
  readonly recibido: number;
  readonly cambio: number;
  readonly tarjeta: CardPayment | null;
  /** Venta ya registrada de la que no se guardó el pago: el ticket omite recibido y cambio. */
  readonly sinDetallePago?: boolean;
  /** Venta anulada: el ticket lo dice. */
  readonly anulada?: boolean;
}
