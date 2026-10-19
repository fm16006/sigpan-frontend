import { Id } from '../../core/models/api.model';
import {
  RawMaterialStock,
  StockMovement,
  StockRow,
  hasInventory,
  isLowStock,
} from '../../core/models/inventory.model';
import { RawMaterial } from '../../core/models/production.model';
import { ChipTone } from '../../shared/ui/status-chip/status-chip';

/** El backend no tiene código de insumo: se arma con el id. */
export function materialCode(id: Id): string {
  return `MP-${String(id).padStart(2, '0')}`;
}

export type MaterialStatus = 'inactiva' | 'sin-inventario' | 'agotada' | 'bajo' | 'suficiente';

export const MATERIAL_STATUS_CHIP: Readonly<
  Record<MaterialStatus, { readonly label: string; readonly tone: ChipTone }>
> = {
  inactiva: { label: 'Inactivo', tone: 'neutral' },
  'sin-inventario': { label: 'Sin inventario', tone: 'neutral' },
  agotada: { label: 'Agotado', tone: 'bad' },
  bajo: { label: 'Reabastecer', tone: 'warn' },
  suficiente: { label: 'Suficiente', tone: 'ok' },
};

export interface MaterialRow extends StockRow {
  readonly codigo: string;
  readonly activo: boolean;
  /** Costo promedio vigente; null si no hay ni movimientos ni precio. */
  readonly costoPromedio: number | null;
  readonly estado: MaterialStatus;
  /** Está activo y su existencia llegó al mínimo. */
  readonly bajoMinimo: boolean;
}

/** Nivel de una existencia frente a su mínimo (se asume inventario habilitado). */
export function levelOf(cantidad: number, minimo: number): 'agotada' | 'bajo' | 'suficiente' {
  if (Number(cantidad) <= 0) return 'agotada';
  return Number(cantidad) <= Number(minimo) ? 'bajo' : 'suficiente';
}

export function statusOf(row: StockRow, activo: boolean): MaterialStatus {
  if (!activo) return 'inactiva';
  if (!hasInventory(row)) return 'sin-inventario';
  return levelOf(row.cantidad, row.minimo);
}

function byRecency(a: StockMovement, b: StockMovement): number {
  return a.fecha.localeCompare(b.fecha) || a.id - b.id;
}

/** Costo final del movimiento más reciente: el costo promedio vigente. */
export function latestCost(movements: readonly StockMovement[]): number | null {
  if (movements.length === 0) return null;
  const sorted = [...movements].sort(byRecency);
  const last = sorted[sorted.length - 1];
  return last.costoFinal === null ? null : Number(last.costoFinal);
}

/** Costo promedio vigente por insumo, del último movimiento de cada uno. */
export function latestCostByMaterial(movements: readonly StockMovement[]): Map<Id, number> {
  const latest = new Map<Id, StockMovement>();
  for (const movement of movements) {
    if (movement.materiaPrimaId === undefined) continue;
    const current = latest.get(movement.materiaPrimaId);
    if (!current || byRecency(current, movement) < 0) {
      latest.set(movement.materiaPrimaId, movement);
    }
  }
  const costs = new Map<Id, number>();
  for (const [id, movement] of latest) {
    if (movement.costoFinal !== null) costs.set(id, Number(movement.costoFinal));
  }
  return costs;
}

export function buildMaterialRow(
  material: RawMaterial,
  stock: RawMaterialStock | undefined,
  cost: number | null | undefined,
): MaterialRow {
  const base: StockRow = {
    kind: 'materia-prima',
    itemId: material.id,
    inventarioId: stock?.id ?? null,
    nombre: material.nombre,
    descripcion: material.descripcion,
    unidad: material.unidadMedida,
    cantidad: Number(stock?.cantidad ?? 0),
    minimo: Number(material.stockMinimo ?? 0),
    fechaActualizacion: stock?.fechaActualizacion ?? null,
    // Una fila sin id es la suma de todas las sucursales: tiene existencia pero no inventario propio.
    consolidado: stock !== undefined && (stock.id ?? null) === null,
  };
  const activo = material.activo !== false;
  const precio =
    material.precio === null || material.precio === undefined ? null : Number(material.precio);
  return {
    ...base,
    codigo: materialCode(material.id),
    activo,
    costoPromedio: cost ?? (precio !== null && precio > 0 ? precio : null),
    estado: statusOf(base, activo),
    bajoMinimo: activo && isLowStock(base),
  };
}

export function buildMaterialRows(
  materials: readonly RawMaterial[],
  stocks: readonly RawMaterialStock[],
  costs: ReadonlyMap<Id, number>,
): MaterialRow[] {
  const stockByMaterial = new Map(stocks.map((stock) => [stock.materiaPrimaId, stock]));
  return materials.map((material) =>
    buildMaterialRow(material, stockByMaterial.get(material.id), costs.get(material.id)),
  );
}

export type MaterialSegment = 'todos' | 'bajo';

/** Minúsculas y sin tildes, para buscar sin importar cómo se escribió. */
export function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

export function filterMaterialRows(
  rows: readonly MaterialRow[],
  query: string,
  segment: MaterialSegment,
): MaterialRow[] {
  const needle = normalize(query);
  return rows.filter(
    (row) =>
      (segment === 'todos' || row.bajoMinimo) &&
      (needle === '' || normalize(`${row.nombre} ${row.codigo}`).includes(needle)),
  );
}

export function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

export interface KardexLine {
  readonly movement: StockMovement;
  /** Entrada en positivo, salida en negativo. */
  readonly delta: number;
  /** Existencia después del movimiento. */
  readonly saldo: number;
}

/**
 * Kárdex con saldo acumulado, del más reciente al más antiguo. Si se conoce la existencia
 * actual, el saldo se ancla a ella (así cuadra aunque falten movimientos antiguos);
 * si no, parte de cero.
 */
export function withRunningBalance(
  movements: readonly StockMovement[],
  existenciaActual: number | null,
): KardexLine[] {
  const ordered = [...movements].sort(byRecency);
  const deltas = ordered.map((movement) =>
    movement.tipo === 'ENTRADA' ? Number(movement.cantidad) : -Number(movement.cantidad),
  );
  const total = deltas.reduce((sum, delta) => sum + delta, 0);
  let saldo = existenciaActual === null ? 0 : existenciaActual - total;
  const lines = ordered.map((movement, index) => {
    saldo += deltas[index];
    return { movement, delta: deltas[index], saldo: round3(saldo) };
  });
  return lines.reverse();
}

export interface PurchaseProjection {
  readonly existencia: number;
  readonly costoPromedio: number;
}

/** Misma fórmula del backend: promedio ponderado con 4 decimales. */
export function projectPurchase(
  existencia: number,
  costoPromedio: number,
  cantidad: number,
  costoUnitario: number,
): PurchaseProjection {
  const total = existencia + cantidad;
  if (total <= 0) return { existencia: round3(total), costoPromedio };
  const average = (existencia * costoPromedio + cantidad * costoUnitario) / total;
  return { existencia: round3(total), costoPromedio: Math.round(average * 10_000) / 10_000 };
}

/** Suma de salidas de los últimos `days` días. */
export function consumption(
  movements: readonly StockMovement[],
  days: number,
  now: Date = new Date(),
): number {
  const since = now.getTime() - days * 86_400_000;
  return round3(
    movements
      .filter(
        (movement) => movement.tipo === 'SALIDA' && new Date(movement.fecha).getTime() >= since,
      )
      .reduce((sum, movement) => sum + Number(movement.cantidad), 0),
  );
}

/** Días que alcanza la existencia al ritmo de consumo de la ventana; null si no hubo consumo. */
export function daysOfSupply(existencia: number, consumed: number, days: number): number | null {
  if (consumed <= 0) return null;
  return Math.floor(existencia / (consumed / days));
}
