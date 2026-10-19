import { CatalogProduct, Especialidad } from '../../core/models/catalog.model';
import { ChipTone } from '../../shared/ui/status-chip/status-chip';
import { ProductMovement } from './models/product-detail.model';

/** Estado de existencia de un producto, el mismo en la lista y en la ficha. */
export type StockState = 'disponible' | 'reabastecer' | 'agotado' | 'inactivo';

export const STOCK_CHIPS: Readonly<Record<StockState, { label: string; tone: ChipTone }>> = {
  disponible: { label: 'Disponible', tone: 'ok' },
  reabastecer: { label: 'Reabastecer', tone: 'warn' },
  agotado: { label: 'Agotado', tone: 'bad' },
  inactivo: { label: 'Inactivo', tone: 'neutral' },
};

type StockFields = Pick<CatalogProduct, 'activo' | 'agotado' | 'disponible' | 'stockMinimo'>;

export function stockState(product: StockFields): StockState {
  if (!product.activo) {
    return 'inactivo';
  }
  const disponible = product.disponible;
  const known = disponible !== null && disponible !== undefined;
  if (product.agotado || (known && disponible <= 0)) {
    return 'agotado';
  }
  if (known && disponible < Number(product.stockMinimo ?? 0)) {
    return 'reabastecer';
  }
  return 'disponible';
}

/** Relleno de la barra de existencia: el mínimo ocupa un tercio del ancho. */
export function stockPercent(product: Pick<CatalogProduct, 'disponible' | 'stockMinimo'>): number {
  const disponible = Number(product.disponible ?? 0);
  const minimo = Number(product.stockMinimo ?? 0);
  if (disponible <= 0) {
    return 2;
  }
  if (minimo <= 0) {
    return 100;
  }
  return Math.max(2, Math.min(100, Math.round((disponible / (minimo * 3)) * 100)));
}

export type StockSegment = 'todos' | 'disponibles' | 'reabastecer' | 'agotados';

export const STOCK_SEGMENTS: readonly { readonly value: StockSegment; readonly label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'disponibles', label: 'Disponibles' },
  { value: 'reabastecer', label: 'Reabastecer' },
  { value: 'agotados', label: 'Agotados' },
];

const SEGMENT_STATE: Readonly<Record<Exclude<StockSegment, 'todos'>, StockState>> = {
  disponibles: 'disponible',
  reabastecer: 'reabastecer',
  agotados: 'agotado',
};

export interface ProductFilters {
  readonly query: string;
  readonly segment: StockSegment;
  /** Vacío = todas. */
  readonly especialidad: Especialidad | '';
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

export function matchesSegment(product: StockFields, segment: StockSegment): boolean {
  return segment === 'todos' || stockState(product) === SEGMENT_STATE[segment];
}

/** Búsqueda por nombre o código, segmento de existencia y especialidad. Ordena por nombre. */
export function filterProducts(
  products: readonly CatalogProduct[],
  filters: ProductFilters,
): CatalogProduct[] {
  const query = normalize(filters.query);
  return products
    .filter(
      (product) =>
        matchesSegment(product, filters.segment) &&
        (!filters.especialidad || product.especialidad === filters.especialidad) &&
        (!query || normalize(`${product.nombre} ${product.codigo}`).includes(query)),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function segmentCounts(
  products: readonly CatalogProduct[],
): Readonly<Record<StockSegment, number>> {
  const counts: Record<StockSegment, number> = {
    todos: products.length,
    disponibles: 0,
    reabastecer: 0,
    agotados: 0,
  };
  for (const product of products) {
    const state = stockState(product);
    if (state === 'disponible') counts.disponibles++;
    else if (state === 'reabastecer') counts.reabastecer++;
    else if (state === 'agotado') counts.agotados++;
  }
  return counts;
}

export interface ProductKpis {
  readonly activos: number;
  readonly bajoMinimo: number;
  readonly agotados: number;
  /** Nombres de los primeros productos a reabastecer, para el texto de apoyo. */
  readonly bajoMinimoNombres: readonly string[];
  readonly agotadosNombres: readonly string[];
}

export function productKpis(products: readonly CatalogProduct[]): ProductKpis {
  const activos = products.filter((product) => product.activo);
  const bajo = activos.filter((product) => stockState(product) === 'reabastecer');
  const agotados = activos.filter((product) => stockState(product) === 'agotado');
  return {
    activos: activos.length,
    bajoMinimo: bajo.length,
    agotados: agotados.length,
    bajoMinimoNombres: bajo.slice(0, 2).map((product) => product.nombre),
    agotadosNombres: agotados.slice(0, 2).map((product) => product.nombre),
  };
}

/** Margen en porcentaje entero sobre el precio; null si falta el costo o el precio. */
export function marginPercent(
  precio: number | null | undefined,
  costo: number | null | undefined,
): number | null {
  const price = Number(precio ?? 0);
  if (costo === null || costo === undefined || !(price > 0)) {
    return null;
  }
  return Math.round(((price - Number(costo)) / price) * 100);
}

export interface MovementSummary {
  readonly total: number;
  readonly entradas: number;
  readonly salidas: number;
  readonly entradasUnidades: number;
  readonly salidasUnidades: number;
}

/** Resumen de los movimientos de los últimos `days` días. */
export function summarizeMovements(
  movements: readonly ProductMovement[],
  now: Date = new Date(),
  days = 7,
): MovementSummary {
  const since = now.getTime() - days * 86_400_000;
  let entradas = 0;
  let salidas = 0;
  let entradasUnidades = 0;
  let salidasUnidades = 0;
  for (const movement of movements) {
    if (new Date(movement.fecha).getTime() < since) {
      continue;
    }
    if (movement.tipo === 'ENTRADA') {
      entradas++;
      entradasUnidades += Number(movement.cantidad);
    } else {
      salidas++;
      salidasUnidades += Number(movement.cantidad);
    }
  }
  return { total: entradas + salidas, entradas, salidas, entradasUnidades, salidasUnidades };
}

export type MovementFilter = 'todos' | 'ENTRADA' | 'SALIDA';

/** Kardex: del más reciente al más antiguo, con filtro por tipo. */
export function kardex(
  movements: readonly ProductMovement[],
  filter: MovementFilter,
): ProductMovement[] {
  return movements
    .filter((movement) => filter === 'todos' || movement.tipo === filter)
    .sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id);
}

export type PromotionState = 'vigente' | 'programada' | 'vencida' | 'inactiva';

export const PROMOTION_CHIPS: Readonly<Record<PromotionState, { label: string; tone: ChipTone }>> = {
  vigente: { label: 'Vigente', tone: 'ok' },
  programada: { label: 'Programada', tone: 'warn' },
  vencida: { label: 'Vencida', tone: 'bad' },
  inactiva: { label: 'Inactiva', tone: 'neutral' },
};

/** `today` y las fechas de la promoción son "YYYY-MM-DD". */
export function promotionState(
  promotion: {
    readonly activo: boolean;
    readonly fechaInicio: string | null;
    readonly fechaFin: string | null;
  },
  today: string,
): PromotionState {
  if (!promotion.activo) return 'inactiva';
  if (promotion.fechaInicio && promotion.fechaInicio > today) return 'programada';
  if (promotion.fechaFin && promotion.fechaFin < today) return 'vencida';
  return 'vigente';
}
