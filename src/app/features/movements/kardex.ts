import { Id } from '../../core/models/api.model';
import {
  MovementType,
  ProductMovement,
  StockKind,
  StockMovement,
} from '../../core/models/inventory.model';
import { todayIso } from '../../core/utils/dates';
import { normalize } from '../raw-materials/raw-material-calc';

/** Una línea del kárdex general: movimiento de insumo o de producto, ya unificado. */
export interface KardexEntry {
  /** Único entre insumos y productos (los ids se repiten entre tablas). */
  readonly key: string;
  readonly kind: StockKind;
  readonly itemId: Id;
  readonly articulo: string;
  readonly tipo: MovementType;
  readonly cantidad: number;
  readonly fecha: string;
  readonly motivo: string | null;
  /** El backend solo guarda documento en movimientos de insumo. */
  readonly documento: string | null;
  /** Costo unitario de la entrada; en una salida, el costo promedio vigente. */
  readonly costo: number | null;
  /** Ruta de la ficha del artículo. */
  readonly link: readonly (string | number)[];
}

export type KardexSegment = 'todos' | 'entradas' | 'salidas';
export type KardexPeriod = 'todo' | 'hoy' | '7d' | 'mes';

export const KARDEX_PERIODS: readonly { readonly value: KardexPeriod; readonly label: string }[] = [
  { value: 'todo', label: 'Todo el historial' },
  { value: 'hoy', label: 'Hoy' },
  { value: '7d', label: 'Últimos 7 días' },
  { value: 'mes', label: 'Este mes' },
];

export function materialMovementEntry(movement: StockMovement): KardexEntry {
  const itemId = movement.materiaPrimaId ?? 0;
  return {
    key: `mp-${movement.id}`,
    kind: 'materia-prima',
    itemId,
    articulo: movement.materiaPrima ?? `Materia prima ${itemId}`,
    tipo: movement.tipo,
    cantidad: Number(movement.cantidad),
    fecha: movement.fecha,
    motivo: movement.motivo,
    documento: movement.documento,
    costo: movement.costoInicial === null ? null : Number(movement.costoInicial),
    link: ['/backoffice/raw-materials', itemId],
  };
}

export function productMovementEntry(movement: ProductMovement): KardexEntry {
  return {
    key: `p-${movement.id}`,
    kind: 'producto',
    itemId: movement.productoId,
    articulo: movement.producto,
    tipo: movement.tipo,
    cantidad: Number(movement.cantidad),
    fecha: movement.fecha,
    motivo: movement.motivo,
    documento: null,
    costo: movement.costoInicial === null ? null : Number(movement.costoInicial),
    link: ['/backoffice/products', movement.productoId, 'existencias'],
  };
}

/** Une los dos orígenes, del movimiento más reciente al más antiguo. */
export function mergeKardex(
  materials: readonly StockMovement[],
  products: readonly ProductMovement[],
): KardexEntry[] {
  return [...materials.map(materialMovementEntry), ...products.map(productMovementEntry)].sort(
    (a, b) => b.fecha.localeCompare(a.fecha) || b.key.localeCompare(a.key, 'es', { numeric: true }),
  );
}

export function inPeriod(fecha: string, period: KardexPeriod, now: Date = new Date()): boolean {
  switch (period) {
    case 'todo':
      return true;
    case 'hoy':
      return fecha.slice(0, 10) === todayIso(now);
    case 'mes':
      return fecha.slice(0, 7) === todayIso(now).slice(0, 7);
    case '7d':
      return new Date(fecha).getTime() >= now.getTime() - 7 * 86_400_000;
  }
}

export function filterKardex(
  entries: readonly KardexEntry[],
  filters: { query: string; segment: KardexSegment; period: KardexPeriod },
  now: Date = new Date(),
): KardexEntry[] {
  const needle = normalize(filters.query);
  return entries.filter(
    (entry) =>
      (filters.segment === 'todos' ||
        (filters.segment === 'entradas' ? entry.tipo === 'ENTRADA' : entry.tipo === 'SALIDA')) &&
      inPeriod(entry.fecha, filters.period, now) &&
      (needle === '' ||
        normalize(`${entry.articulo} ${entry.documento ?? ''} ${entry.motivo ?? ''}`).includes(
          needle,
        )),
  );
}
