import { Id } from './api.model';

export const ORDER_STATUSES = [
  'PENDIENTE',
  'EN_PREPARACION',
  'LISTO',
  'ENTREGADO',
  'CANCELADO',
] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface SaleLine {
  readonly id: Id;
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
  readonly precio: number;
  readonly descuento: number;
  readonly subtotal: number;
  /** Exenta de IVA cuando se vendió. */
  readonly exento?: boolean;
  /** Precio unitario sin IVA según la configuración guardada en la venta (comprobante de crédito fiscal). */
  readonly precioUnitarioSinIva?: number;
}

export interface Sale {
  readonly id: Id;
  readonly usuarioId: Id | null;
  readonly usuario: string | null;
  /** Nulo en los pedidos en línea. */
  readonly cajaId?: Id | null;
  readonly caja?: string | null;
  readonly tipo: string;
  readonly estado: string;
  readonly fecha: string;
  readonly subtotal: number;
  readonly descuento: number;
  /** Total a pagar: ya incluye el IVA. */
  readonly total: number;
  /** Desglose y configuración del IVA guardados con la venta; no cambian si la empresa cambia su configuración. */
  readonly aplicaIva?: boolean;
  readonly ivaIncluido?: boolean;
  readonly tasaIvaAplicada?: number;
  readonly ventasGravadas?: number;
  readonly ventasExentas?: number;
  readonly iva?: number;
  readonly detalles: readonly SaleLine[] | null;
}

export interface SaleRequest {
  readonly lineas: readonly { readonly productoId: Id; readonly cantidad: number }[];
  /** Solo en la venta de mostrador: caja donde se cobra. */
  readonly cajaId?: Id;
  /** Total que el cliente vio al cotizar; si ya no coincide al confirmar, el servidor responde 409 TOTAL_CAMBIO. */
  readonly totalEsperado?: number;
}


export interface CashCut {
  readonly fecha: string;
  readonly cantidadVentas: number;
  readonly productosVendidos: number;
  readonly total: number;
  readonly ventas: readonly Sale[];
}

export const ORDER_STATUS_LABELS: Readonly<Partial<Record<string, string>>> = {
  PENDIENTE: 'Pendiente',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo para entregar',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  COMPLETADA: 'Completada',
};

export const ORDER_STATUS_BADGE: Readonly<Partial<Record<string, string>>> = {
  PENDIENTE: 'badge-ghost',
  EN_PREPARACION: 'badge-warning',
  LISTO: 'badge-info',
  ENTREGADO: 'badge-success',
  CANCELADO: 'badge-error',
  COMPLETADA: 'badge-success',
};

// Siguiente paso del pedido en la cola de despacho.
export const NEXT_STATUS: Readonly<Partial<Record<OrderStatus, OrderStatus>>> = {
  PENDIENTE: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
  LISTO: 'ENTREGADO',
};
