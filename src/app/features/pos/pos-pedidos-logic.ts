import { Sale } from '../../core/models/order.model';
import { todayIso } from '../../core/utils/dates';
import { Receipt } from './models/checkout.model';
import { PosOrder } from './pos-orders';

/** Estado con el que el backend marca una venta anulada. */
export const CANCELLED_STATE = 'CANCELADO';

export function isCancelled(sale: Sale): boolean {
  return sale.estado === CANCELLED_STATE;
}

/** Nombres de los primeros productos de un borrador y cuántos quedan fuera. */
export function orderPreview(
  order: PosOrder,
  max = 3,
): { readonly names: readonly string[]; readonly more: number } {
  const names = order.lines.slice(0, max).map((line) => line.product.nombre);
  return { names, more: Math.max(0, order.lines.length - max) };
}

/** "YYYY-MM-DD" del día anterior (o de `days` días antes) a la fecha dada. */
export function shiftDay(iso: string, days: number): string {
  const [year, month, day] = iso.split('-').map(Number);
  return todayIso(new Date(year, month - 1, day - days, 12));
}

export function yesterdayIso(now: Date = new Date()): string {
  return shiftDay(todayIso(now), 1);
}

/** Una fecha sirve para consultar el corte si es "YYYY-MM-DD" válida y no es futura. */
export function isQueryableDay(iso: string, today: string = todayIso()): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || iso > today) {
    return false;
  }
  const [year, month, day] = iso.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.getMonth() === month - 1 && date.getDate() === day;
}

/** "2026-10-19" como fecha local (mediodía, para que ninguna zona horaria la cambie de día). */
export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, 12);
}

/** Artículos de una venta: suma de las cantidades de sus líneas. */
export function saleItemCount(sale: Sale): number {
  return (sale.detalles ?? []).reduce((sum, line) => sum + line.cantidad, 0);
}

/** Más reciente primero; a igual hora, la de número mayor. */
export function sortSales(sales: readonly Sale[]): readonly Sale[] {
  return [...sales].sort(
    (a, b) => Date.parse(b.fecha) - Date.parse(a.fecha) || Number(b.id) - Number(a.id),
  );
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Busca por número de venta ("123" o "#123") o por nombre de producto, sin tildes ni mayúsculas. */
export function filterSales(sales: readonly Sale[], query: string): readonly Sale[] {
  const text = normalize(query).replace(/^#/, '');
  if (!text) {
    return sales;
  }
  return sales.filter(
    (sale) =>
      String(sale.id).includes(text) ||
      (sale.detalles ?? []).some((line) => normalize(line.producto).includes(text)),
  );
}

export interface DaySummary {
  /** Ventas vigentes (sin las anuladas). */
  readonly ventas: number;
  readonly anuladas: number;
  readonly articulos: number;
  readonly total: number;
}

/** Resumen del día: las anuladas se cuentan aparte y no suman al total. Suma en centavos. */
export function summarizeSales(sales: readonly Sale[]): DaySummary {
  let cents = 0;
  let ventas = 0;
  let anuladas = 0;
  let articulos = 0;
  for (const sale of sales) {
    if (isCancelled(sale)) {
      anuladas++;
      continue;
    }
    ventas++;
    articulos += saleItemCount(sale);
    cents += Math.round(Number(sale.total) * 100);
  }
  return { ventas, anuladas, articulos, total: cents / 100 };
}

/**
 * Arma el ticket de una venta ya registrada. El backend no guarda el pago, así que el
 * ticket no trae "recibido" ni "cambio" (`sinDetallePago`).
 */
export function saleToReceipt(sale: Sale): Receipt {
  const lineas = (sale.detalles ?? []).map((line) => ({
    cantidad: line.cantidad,
    descripcion: line.producto,
    precio: Number(line.precio),
    importe: Number(line.subtotal),
  }));
  return {
    numero: sale.id,
    fecha: new Date(sale.fecha),
    cajero: sale.usuario ?? '—',
    documento: 'TICKET',
    metodo: 'EFECTIVO',
    lineas,
    total: Number(sale.total),
    recibido: 0,
    cambio: 0,
    tarjeta: null,
    sinDetallePago: true,
    anulada: isCancelled(sale),
  };
}
