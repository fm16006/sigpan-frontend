import { Id } from './api.model';

export const ORDER_STATUSES = ['PENDING', 'PREPARING', 'READY', 'DELIVERED', 'CANCELLED'] as const;

export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderLine {
  readonly productId: Id;
  readonly productName: string;
  readonly quantity: number;
  readonly unitPrice: number;
}

export interface Order {
  readonly id: Id;
  readonly code: string;
  readonly status: OrderStatus;
  readonly lines: readonly OrderLine[];
  readonly total: number;
  readonly createdAt: string;
}

/** Sin totales: los calcula el backend con los precios vigentes. */
export interface OrderRequest {
  readonly lines: readonly { readonly productId: Id; readonly quantity: number }[];
  readonly notes?: string;
}

export const ORDER_STATUS_LABELS: Readonly<Record<OrderStatus, string>> = {
  PENDING: 'Pendiente',
  PREPARING: 'En preparación',
  READY: 'Listo',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

/** Clase del badge por estado, para no repetir el mapeo en cada vista. */
export const ORDER_STATUS_BADGE: Readonly<Record<OrderStatus, string>> = {
  PENDING: 'badge-ghost',
  PREPARING: 'badge-warning',
  READY: 'badge-info',
  DELIVERED: 'badge-success',
  CANCELLED: 'badge-error',
};
