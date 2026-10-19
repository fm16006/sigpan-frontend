import { Id } from './api.model';

/** Una linea cotizada por el backend. Todos los importes vienen calculados; el front no los recalcula. */
export interface QuoteLine {
  readonly productoId: Id;
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly subtotal: number;
  readonly descuento: number;
  readonly total: number;
  /** Regla que originó el descuento de la linea, formato TIPO:ID. */
  readonly regla: string | null;
  /** El producto es exento de IVA. */
  readonly exento?: boolean;
}

/** Regla que se evaluó pero no ganó, con el motivo. */
export interface RejectedRule {
  readonly regla: string;
  readonly total: number;
  readonly motivo: string;
}

export interface Quote {
  readonly lineas: readonly QuoteLine[];
  readonly subtotal: number;
  readonly descuento: number;
  /** Total a pagar: ya incluye el IVA, vaya o no incluido en los precios. */
  readonly total: number;
  /** Configuración del IVA con la que el servidor calculó esta cotización. */
  readonly aplicaIva: boolean;
  readonly ivaIncluido: boolean;
  readonly tasaIva: number;
  readonly ventasGravadas: number;
  readonly ventasExentas: number;
  readonly iva: number;
  readonly ahorro: number;
  readonly reglaAplicada: string | null;
  readonly descartadas: readonly RejectedRule[];
}

export interface QuoteRequest {
  readonly lineas: readonly { readonly productoId: Id; readonly cantidad: number }[];
}

/** Nombre legible de una regla TIPO:ID. Solo texto, no calcula nada. */
export function ruleLabel(regla: string | null | undefined): string {
  if (!regla) return '';
  const [tipo, id] = regla.split(':');
  switch (tipo) {
    case 'PROMOCION':
      return `Promoción #${id}`;
    case 'COMBO':
      return `Combo #${id}`;
    case 'ESCALA':
      return 'Precio por mayoreo';
    default:
      return regla;
  }
}
