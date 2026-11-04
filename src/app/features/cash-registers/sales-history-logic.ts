import { ORDER_STATUS_LABELS, SaleSummary } from '../../core/models/order.model';

export type SaleChannel = SaleSummary['tipo'];

export const CHANNEL_LABELS: Readonly<Record<SaleChannel, string>> = {
  MOSTRADOR: 'Mostrador',
  EN_LINEA: 'En línea',
  ENCARGO: 'Encargo',
};

const PAYMENT_LABELS: Readonly<Record<string, string>> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  MIXTO: 'Mixto',
};

/** Estados que tiene sentido filtrar según el canal elegido (sin canal, todos). */
export function statusOptions(channel: SaleChannel | null): readonly string[] {
  const counter = ['COMPLETADA', 'ANULADA'];
  const orders = ['PENDIENTE', 'CONFIRMADO', 'EN_PREPARACION', 'LISTO', 'EN_RUTA', 'EN_ESPERA_RETIRO', 'ENTREGADO', 'CANCELADO'];
  if (channel === 'MOSTRADOR') return counter;
  if (channel) return orders;
  return [...counter, ...orders];
}

export function statusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] ?? status;
}

export function paymentLabel(method: string | null): string {
  return method ? (PAYMENT_LABELS[method] ?? method) : '—';
}

/** Una sola búsqueda: un número busca la venta por número; un texto, al cliente por nombre o correo. */
export function parseSearch(text: string): { numero?: number; cliente?: string } {
  const value = text.trim().replace(/^#/, '');
  if (!value) return {};
  return /^\d+$/.test(value) ? { numero: Number(value) } : { cliente: value };
}

/** Quién: el cajero en mostrador, el cliente en pedidos y encargos. */
export function whoOf(sale: SaleSummary): string {
  return sale.tipo === 'MOSTRADOR' ? (sale.cajero ?? '—') : (sale.cliente ?? '—');
}

export const CSV_HEADER = ['Número', 'Fecha', 'Canal', 'Estado', 'Cajero o cliente', 'Caja', 'Método de pago', 'Total'];

export function csvRow(sale: SaleSummary): (string | number)[] {
  return [
    sale.id,
    sale.fecha.replace('T', ' ').slice(0, 16),
    CHANNEL_LABELS[sale.tipo] ?? sale.tipo,
    statusLabel(sale.estado),
    whoOf(sale),
    sale.caja ?? '',
    paymentLabel(sale.metodoPago),
    Number(sale.total),
  ];
}
