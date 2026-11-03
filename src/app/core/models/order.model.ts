import { Id } from './api.model';

export const ORDER_STATUSES = [
  'PENDIENTE',
  'CONFIRMADO',
  'EN_PREPARACION',
  'LISTO',
  'EN_RUTA',
  'EN_ESPERA_RETIRO',
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
  readonly metodoPago?: PaymentMethod | null;
  readonly efectivoRecibido?: number | null;
  readonly montoTarjeta?: number | null;
  readonly cambio?: number | null;
  readonly modalidad?: DeliveryMode | null;
  readonly fechaProgramada?: string | null;
  readonly direccionEntrega?: string | null;
  readonly telefonoContacto?: string | null;
  /** Estado al que avanza con un gesto; nulo si ya terminó. */
  readonly siguienteEstado?: OrderStatus | null;
  readonly tipoDte?: string | null;
  readonly numeroControl?: string | null;
  readonly codigoGeneracion?: string | null;
  readonly receptorNombre?: string | null;
  readonly receptorNumDocumento?: string | null;
  readonly receptorNrc?: string | null;
  readonly detalles: readonly SaleLine[] | null;
  readonly historial?: readonly OrderStatusChange[] | null;
  /** HU-55: lleva productos por encargo. */
  readonly encargo?: boolean;
  /** HU-37 */
  readonly motivoAnulacion?: string | null;
  readonly fechaAnulacion?: string | null;
}

export type PaymentMethod = 'EFECTIVO' | 'TARJETA' | 'MIXTO';
export type DeliveryMode = 'RETIRO' | 'ENTREGA';

export interface OrderStatusChange {
  readonly id: Id;
  readonly estado: string;
  readonly fecha: string;
  readonly usuario?: string | null;
}

/** Faltante que devuelve el servidor (HU-40) para proponer el ajuste. */
export interface StockShortage {
  readonly productoId: Id;
  readonly producto: string;
  readonly solicitado: number;
  readonly disponible: number;
}

export interface SaleRequest {
  readonly lineas: readonly { readonly productoId: Id; readonly cantidad: number }[];
  /** Solo en la venta de mostrador: caja donde se cobra. */
  readonly cajaId?: Id;
  /** Total que el cliente vio al cotizar; si ya no coincide al confirmar, el servidor responde 409 TOTAL_CAMBIO. */
  readonly totalEsperado?: number;
  readonly metodoPago?: PaymentMethod;
  readonly efectivoRecibido?: number;
  /** Solo en el pago mixto. */
  readonly montoTarjeta?: number;
  readonly modalidad?: DeliveryMode;
  /** ISO local (AAAA-MM-DDTHH:mm); vacío es lo antes posible. */
  readonly fechaProgramada?: string;
  readonly direccionEntrega?: string;
  readonly telefonoContacto?: string;
  readonly tipoDte?: '01' | '03';
  readonly receptorNombre?: string;
  readonly receptorNumDocumento?: string;
  readonly receptorNrc?: string;
}


export interface CashCut {
  readonly fecha: string;
  readonly cantidadVentas: number;
  readonly productosVendidos: number;
  readonly total: number;
  readonly efectivo?: number;
  readonly tarjeta?: number;
  readonly ventas: readonly Sale[];
}

export interface CashShift {
  readonly id: Id;
  readonly cajaId: Id;
  readonly caja: string;
  readonly usuarioId: Id;
  readonly usuario: string;
  readonly estado: 'ABIERTO' | 'CERRADO';
  readonly apertura: string;
  readonly fondoInicial: number;
  readonly cierre: string | null;
  readonly cantidadVentas: number;
  readonly totalVentas: number;
  readonly efectivoVentas: number;
  readonly tarjetaVentas: number;
  readonly efectivoEsperado: number;
  readonly efectivoContado: number | null;
  readonly diferencia: number | null;
  readonly observacion: string | null;
  /** HU-68: quién cerró el turno; nulo si sigue abierto o se cerró antes de registrarlo. */
  readonly cerradoPorId?: Id | null;
  readonly cerradoPor?: string | null;
  /** HU-68: cambios de cajero del turno, del más antiguo al más reciente. */
  readonly cambios?: readonly ShiftHandover[];
}

/** HU-68: el turno pasó de un cajero a otro sin cerrarse. */
export interface ShiftHandover {
  readonly anterior: string;
  readonly nuevo: string;
  readonly realizadoPor: string;
  readonly fecha: string;
  readonly nota: string | null;
}

/** HU-68: GET /turnos/cajeros */
export interface CashierOption {
  readonly id: number;
  readonly nombre: string;
  readonly rol: string;
}

/** HU-68: GET /turnos/cajas. `turno` trae los montos solo para administración y auditoría. */
export interface RegisterStatus {
  readonly cajaId: Id;
  readonly caja: string;
  readonly codigo: string | null;
  readonly ocupada: boolean;
  readonly turnoId: Id | null;
  readonly usuarioId: Id | null;
  readonly usuario: string | null;
  readonly apertura: string | null;
  readonly turno: CashShift | null;
}

export interface BestSeller {
  readonly productoId: Id;
  readonly producto: string;
  readonly cantidad: number;
}

export const ORDER_STATUS_LABELS: Readonly<Partial<Record<string, string>>> = {
  PENDIENTE: 'Recibido',
  CONFIRMADO: 'Confirmado',
  EN_PREPARACION: 'En producción',
  LISTO: 'Listo',
  EN_RUTA: 'En ruta',
  EN_ESPERA_RETIRO: 'En espera de retiro',
  ENTREGADO: 'Entregado',
  CANCELADO: 'Cancelado',
  COMPLETADA: 'Completada',
};

export const ORDER_STATUS_BADGE: Readonly<Partial<Record<string, string>>> = {
  PENDIENTE: 'badge-ghost',
  CONFIRMADO: 'badge-neutral',
  EN_PREPARACION: 'badge-warning',
  LISTO: 'badge-info',
  EN_RUTA: 'badge-accent',
  EN_ESPERA_RETIRO: 'badge-accent',
  ENTREGADO: 'badge-success',
  CANCELADO: 'badge-error',
  COMPLETADA: 'badge-success',
};

export const DELIVERY_MODE_LABELS: Readonly<Record<DeliveryMode, string>> = {
  RETIRO: 'Retiro en tienda',
  ENTREGA: 'Entrega a domicilio',
};

/** Estados en curso: se pueden cancelar. */
export const OPEN_STATUSES: readonly string[] = ORDER_STATUSES.filter(
  (s) => s !== 'ENTREGADO' && s !== 'CANCELADO',
);
