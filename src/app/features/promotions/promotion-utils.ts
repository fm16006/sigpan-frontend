import { Id } from '../../core/models/api.model';
import { CatalogProduct } from '../../core/models/catalog.model';
import { Promotion, PromotionScope } from '../../core/models/promotion.model';

/** Vigencia calculada por fecha local: el backend ya filtra por fecha, esto solo lo muestra. */
export type PromotionStatus = 'VIGENTE' | 'PROGRAMADA' | 'VENCIDA' | 'INACTIVA';

export type PromotionSegment = 'TODAS' | PromotionStatus;

export const PROMOTION_SEGMENTS: readonly { readonly value: PromotionSegment; readonly label: string }[] = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'VIGENTE', label: 'Vigentes' },
  { value: 'PROGRAMADA', label: 'Programadas' },
  { value: 'VENCIDA', label: 'Vencidas' },
  { value: 'INACTIVA', label: 'Inactivas' },
];

export const PROMOTION_STATUS_LABELS: Readonly<Record<PromotionStatus, string>> = {
  VIGENTE: 'Vigente',
  PROGRAMADA: 'Programada',
  VENCIDA: 'Vencida',
  INACTIVA: 'Inactiva',
};

const MONTHS_SHORT = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTHS_LONG = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

/** Estado de una promoción para la fecha `today` ("YYYY-MM-DD"). */
export function promotionStatus(promotion: Promotion, today: string): PromotionStatus {
  if (!promotion.activo) return 'INACTIVA';
  if (promotion.fechaInicio && today < promotion.fechaInicio) return 'PROGRAMADA';
  if (promotion.fechaFin && today > promotion.fechaFin) return 'VENCIDA';
  return 'VIGENTE';
}

/**
 * Si el rango es un mes calendario completo (del 1 al último día del mismo mes) devuelve
 * "YYYY-MM"; si no, null. Sirve para abrir la edición en modo "Mes completo".
 */
export function fullMonthOf(inicio: string | null, fin: string | null): string | null {
  if (!inicio || !fin) return null;
  const start = /^(\d{4})-(\d{2})-(\d{2})/.exec(inicio);
  const end = /^(\d{4})-(\d{2})-(\d{2})/.exec(fin);
  if (!start || !end) return null;
  if (start[1] !== end[1] || start[2] !== end[2] || start[3] !== '01') return null;
  const lastDay = new Date(Number(start[1]), Number(start[2]), 0).getDate();
  return Number(end[3]) === lastDay ? `${start[1]}-${start[2]}` : null;
}

/** "2026-05-12" -> "12 may 2026". */
export function formatShortDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!match) return iso;
  return `${Number(match[3])} ${MONTHS_SHORT[Number(match[2]) - 1] ?? match[2]} ${match[1]}`;
}

/** "2026-11" -> "Noviembre 2026". */
export function formatMonth(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return month;
  const name = MONTHS_LONG[Number(match[2]) - 1] ?? match[2];
  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${match[1]}`;
}

/** Vigencia en una línea: el nombre del mes si es un mes completo, o "d MMM y — d MMM y". */
export function vigenciaLabel(promotion: Promotion): string {
  const { fechaInicio, fechaFin } = promotion;
  const month = fullMonthOf(fechaInicio, fechaFin);
  if (month) return formatMonth(month);
  if (fechaInicio && fechaFin) return `${formatShortDate(fechaInicio)} — ${formatShortDate(fechaFin)}`;
  if (fechaInicio) return `Desde ${formatShortDate(fechaInicio)}`;
  if (fechaFin) return `Hasta ${formatShortDate(fechaFin)}`;
  return 'Sin fechas';
}

export interface PromotionFilter {
  readonly segment: PromotionSegment;
  readonly term: string;
}

export function filterPromotions(
  promotions: readonly Promotion[],
  filter: PromotionFilter,
  today: string,
): Promotion[] {
  const term = filter.term.trim().toLowerCase();
  return promotions.filter(
    (promotion) =>
      (filter.segment === 'TODAS' || promotionStatus(promotion, today) === filter.segment) &&
      (!term ||
        promotion.nombre.toLowerCase().includes(term) ||
        (promotion.descripcion ?? '').toLowerCase().includes(term)),
  );
}

/** Cantidad de promociones por segmento (para el contador de cada pestaña). */
export function countBySegment(
  promotions: readonly Promotion[],
  today: string,
): Record<PromotionSegment, number> {
  const counts: Record<PromotionSegment, number> = {
    TODAS: promotions.length,
    VIGENTE: 0,
    PROGRAMADA: 0,
    VENCIDA: 0,
    INACTIVA: 0,
  };
  for (const promotion of promotions) counts[promotionStatus(promotion, today)]++;
  return counts;
}

/** Alcance de la promoción; las respuestas anteriores a la HU-64 no lo traen y eran por productos. */
export function scopeOf(promotion: Pick<Promotion, 'alcance'>): PromotionScope {
  return promotion.alcance ?? 'PRODUCTOS';
}

/** Alcance en lenguaje claro: «Todos los productos», «Categorías: Postres, Bebidas» o «3 productos». */
export function scopeSummary(
  promotion: Pick<Promotion, 'alcance' | 'categorias' | 'productoIds'>,
): string {
  switch (scopeOf(promotion)) {
    case 'TODOS':
      return 'Todos los productos';
    case 'CATEGORIAS': {
      const names = promotion.categorias ?? [];
      if (names.length === 0) return 'Sin categorías';
      return `${names.length === 1 ? 'Categoría' : 'Categorías'}: ${names.join(', ')}`;
    }
    default: {
      const count = promotion.productoIds?.length ?? 0;
      if (count === 0) return 'Sin productos';
      return count === 1 ? '1 producto' : `${count} productos`;
    }
  }
}

/** Texto sin mayúsculas ni tildes, para buscar «cafe» y encontrar «Café». */
export function normalizeText(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Productos activos que coinciden con el término (nombre, código o categoría). Sin término, todos. */
export function filterProducts(products: readonly CatalogProduct[], term: string): CatalogProduct[] {
  const needle = normalizeText(term);
  return products.filter(
    (product) =>
      product.activo &&
      (!needle ||
        normalizeText(product.nombre).includes(needle) ||
        normalizeText(product.codigo ?? '').includes(needle) ||
        normalizeText(product.categoria ?? '').includes(needle)),
  );
}

/** Agrega a la selección los ids dados (los demás se conservan). */
export function addToSelection(selected: ReadonlySet<Id>, ids: readonly Id[]): ReadonlySet<Id> {
  return new Set([...selected, ...ids]);
}

/** Cuántos de los ids seleccionados están entre los visibles (los desactivados no se ofrecen ni se cuentan). */
export function countVisibleSelected(selected: ReadonlySet<Id>, visible: readonly { readonly id: Id }[]): number {
  return visible.filter((item) => selected.has(item.id)).length;
}
