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
  readonly precio: number;
  readonly importe: number;
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
  readonly documento: DocumentKind;
  readonly metodo: PaymentMethod;
  readonly lineas: readonly ReceiptLine[];
  readonly total: number;
  readonly recibido: number;
  readonly cambio: number;
  readonly tarjeta: CardPayment | null;
}
