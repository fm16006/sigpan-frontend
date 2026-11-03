import { RegisterStatus } from '../../core/models/order.model';

const TIME = new Intl.DateTimeFormat('es-SV', { hour: 'numeric', minute: '2-digit' });
const DAY = new Intl.DateTimeFormat('es-SV', { weekday: 'short', day: 'numeric', month: 'short' });

/** Fecha local (año, mes, día) para comparar días sin la hora. */
function dayKey(date: Date): string {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

/**
 * Desde cuándo está ocupada la caja (HU-68): "hoy 7:30 a. m.", "ayer 6:15 p. m." o el día con
 * la hora. `stale` marca un turno que viene de otro día: casi siempre alguien olvidó cerrarlo.
 */
export function occupiedSince(apertura: string, now: Date = new Date()): { label: string; stale: boolean } {
  const opened = new Date(apertura);
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const time = TIME.format(opened);
  if (dayKey(opened) === dayKey(now)) {
    return { label: `hoy ${time}`, stale: false };
  }
  if (dayKey(opened) === dayKey(yesterday)) {
    return { label: `ayer ${time}`, stale: true };
  }
  return { label: `${DAY.format(opened)} ${time}`, stale: true };
}

/** Contado menos esperado, a dos decimales; negativo es faltante. */
export function cashDifference(counted: number, expected: number): number {
  return Math.round((counted - expected) * 100) / 100;
}

/** Cuántas cajas están ocupadas y cuántas libres. */
export function registerCounts(list: readonly RegisterStatus[]): { busy: number; free: number } {
  const busy = list.filter((item) => item.ocupada).length;
  return { busy, free: list.length - busy };
}
