import { PriceScale } from '../../core/models/price-scale.model';

/** Cantidades que muestra la vista previa de "cuánto se cobra". */
export const PREVIEW_QUANTITIES: readonly number[] = [1, 12, 24];

export interface ScaleRow {
  readonly tramo: PriceScale;
  /** Primera cantidad del tramo. */
  readonly desde: number;
  /** Última cantidad antes del siguiente tramo activo; null si es el último (o está inactivo). */
  readonly hasta: number | null;
  /** Total de comprar `desde` unidades a este precio. */
  readonly ejemploTotal: number;
}

export interface PricePreview {
  readonly cantidad: number;
  readonly precioUnitario: number;
  readonly total: number;
  /** El tramo de mayoreo que se aplica, o null si se cobra el precio base. */
  readonly tramo: PriceScale | null;
}

function round2(value: number): number {
  return Math.round(value * 100 + 1e-9) / 100;
}

/** Tramos ordenados por cantidad, con el "hasta" derivado del siguiente tramo activo. */
export function buildScaleRows(tramos: readonly PriceScale[]): ScaleRow[] {
  const sorted = [...tramos].sort((a, b) => a.cantidadMinima - b.cantidadMinima);
  return sorted.map((tramo, index) => {
    const next = tramo.activo ? sorted.slice(index + 1).find((other) => other.activo) : undefined;
    return {
      tramo,
      desde: tramo.cantidadMinima,
      hasta: next ? next.cantidadMinima - 1 : null,
      ejemploTotal: round2(tramo.cantidadMinima * tramo.precioUnitario),
    };
  });
}

/** "12 a 23 unidades", "24 unidades o más" o, si el tramo está inactivo, "Desde 12 unidades". */
export function rangeLabel(row: ScaleRow): string {
  if (!row.tramo.activo) return `Desde ${row.desde} ${row.desde === 1 ? 'unidad' : 'unidades'}`;
  if (row.hasta === null) return `${row.desde} ${row.desde === 1 ? 'unidad' : 'unidades'} o más`;
  if (row.hasta === row.desde) return `${row.desde} ${row.desde === 1 ? 'unidad' : 'unidades'}`;
  return `${row.desde} a ${row.hasta} unidades`;
}

/** Rango que se cobra al precio base: de 1 hasta el primer tramo activo. Null si un tramo arranca en 1. */
export function baseRangeLabel(tramos: readonly PriceScale[]): string | null {
  const first = tramos
    .filter((tramo) => tramo.activo)
    .reduce<number | null>((min, tramo) => (min === null || tramo.cantidadMinima < min ? tramo.cantidadMinima : min), null);
  if (first === null) return 'Todas las cantidades';
  if (first <= 1) return null;
  return first === 2 ? '1 unidad' : `1 a ${first - 1} unidades`;
}

/** Cuánto cuesta comprar `cantidad` unidades: gana el tramo activo más alto que alcance. */
export function previewPrice(cantidad: number, tramos: readonly PriceScale[], basePrice: number): PricePreview {
  const tramo =
    tramos
      .filter((candidate) => candidate.activo && candidate.cantidadMinima <= cantidad)
      .sort((a, b) => b.cantidadMinima - a.cantidadMinima)[0] ?? null;
  const precioUnitario = tramo ? tramo.precioUnitario : basePrice;
  return { cantidad, precioUnitario, total: round2(cantidad * precioUnitario), tramo };
}

/** Cantidades que el formulario ofrece con un toque. */
export const QUICK_QUANTITIES: readonly number[] = [6, 12, 24, 50];

export interface TierBounds {
  /** Precio unitario que hoy se cobra a esa cantidad: el tramo nuevo tiene que ser menor. */
  readonly menorQue: number;
  /** Precio del siguiente tramo activo (más cantidad): el nuevo tiene que ser mayor; null si no hay. */
  readonly mayorQue: number | null;
}

/** Entre qué precios tiene que quedar un tramo que arranca en `cantidad` (sin contar el que se edita). */
export function tierBounds(cantidad: number, otros: readonly PriceScale[], basePrice: number): TierBounds {
  const siguiente = otros
    .filter((tramo) => tramo.activo && tramo.cantidadMinima > cantidad)
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima)[0];
  return {
    menorQue: previewPrice(Math.max(1, cantidad), otros, basePrice).precioUnitario,
    mayorQue: siguiente ? siguiente.precioUnitario : null,
  };
}

/**
 * Tramo sugerido al abrir el formulario: la docena si no hay tramos (o la siguiente docena libre),
 * con un 10 % menos que lo que hoy se cobra a esa cantidad.
 */
export function suggestTier(tramos: readonly PriceScale[], basePrice: number): { cantidadMinima: number; precioUnitario: number } {
  const usadas = new Set(tramos.map((tramo) => tramo.cantidadMinima));
  let cantidadMinima = 12;
  while (usadas.has(cantidadMinima)) cantidadMinima += 12;
  const actual = previewPrice(cantidadMinima, tramos, basePrice).precioUnitario;
  return { cantidadMinima, precioUnitario: Math.max(0.01, round2(actual * 0.9)) };
}
