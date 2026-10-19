import { CatalogProduct } from '../../core/models/catalog.model';
import { PriceScale } from '../../core/models/price-scale.model';
import { MoneyPipe } from '../../shared/pipes/money.pipe';

/**
 * Busca un producto por lo que llega del lector o del teclado: primero el `codigo`
 * exacto (sin distinguir mayúsculas) y, como respaldo, el id numérico.
 */
export function findByCode(
  products: readonly CatalogProduct[],
  input: string,
): CatalogProduct | null {
  const code = input.trim().toLowerCase();
  if (!code) {
    return null;
  }
  const byCode = products.find((product) => product.codigo.trim().toLowerCase() === code);
  if (byCode) {
    return byCode;
  }
  return /^\d+$/.test(code) ? (products.find((product) => product.id === Number(code)) ?? null) : null;
}

/** Productos que coinciden con el texto (nombre o código) y la categoría elegida. */
export function filterProducts(
  products: readonly CatalogProduct[],
  term: string,
  category: string,
): CatalogProduct[] {
  const text = term.trim().toLowerCase();
  return products
    .filter((product) => !category || product.categoria === category)
    .filter(
      (product) =>
        !text ||
        product.nombre.toLowerCase().includes(text) ||
        product.codigo.toLowerCase().includes(text) ||
        String(product.id) === text,
    )
    .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));
}

export type PosShortcut =
  | 'buscar'
  | 'cobrar'
  | 'mas'
  | 'menos'
  | 'quitar'
  | 'nuevo-pedido'
  | 'pedido-siguiente'
  | 'pedido-anterior';

/** Teclas modificadoras presionadas junto con la tecla del atajo. */
export interface ShortcutModifiers {
  readonly ctrl?: boolean;
  readonly shift?: boolean;
}

/**
 * Atajo de teclado de la pantalla de venta. F2, F3, F12 y los de Ctrl funcionan siempre;
 * el resto se ignora mientras se escribe en un campo, para no tocar el ticket sin querer.
 */
export function posShortcut(
  key: string,
  typing: boolean,
  modifiers: ShortcutModifiers = {},
): PosShortcut | null {
  if (modifiers.ctrl) {
    if (key.toLowerCase() === 'n') return 'nuevo-pedido';
    if (key === 'Tab') return modifiers.shift ? 'pedido-anterior' : 'pedido-siguiente';
    return null;
  }
  if (key === 'F2') return 'buscar';
  if (key === 'F3') return 'nuevo-pedido';
  if (key === 'F12') return 'cobrar';
  if (typing) return null;
  if (key === '+') return 'mas';
  if (key === '-') return 'menos';
  if (key === 'Delete') return 'quitar';
  return null;
}

/** Cuánto de un tramo puede faltar para que valga la pena avisar (la mitad del tramo). */
const NEAR_TIER_RATIO = 0.5;

export interface TierHint {
  /** Unidades que faltan para llegar al tramo. */
  readonly missing: number;
  readonly minQuantity: number;
  readonly unitPrice: number;
}

/**
 * Siguiente tramo de mayoreo que conviene avisar (HU-33): el más cercano por encima de
 * la cantidad actual, más barato que lo que se paga hoy por unidad y "cerca" (a no más
 * de la mitad del tramo). Desaparece solo cuando la cantidad ya alcanza el tramo.
 */
export function nextTier(
  scales: readonly PriceScale[],
  quantity: number,
  currentUnitPrice: number,
): TierHint | null {
  const next = scales
    .filter(
      (scale) =>
        scale.activo && scale.cantidadMinima > quantity && scale.precioUnitario < currentUnitPrice,
    )
    .sort((a, b) => a.cantidadMinima - b.cantidadMinima)[0];
  if (!next) {
    return null;
  }
  const missing = Number((next.cantidadMinima - quantity).toFixed(3));
  if (missing > Math.ceil(next.cantidadMinima * NEAR_TIER_RATIO)) {
    return null;
  }
  return { missing, minQuantity: next.cantidadMinima, unitPrice: next.precioUnitario };
}

const MONEY = new MoneyPipe();

export function tierHintText(hint: TierHint): string {
  return `Con ${hint.missing} más paga ${MONEY.transform(hint.unitPrice)} c/u`;
}

/** Nombre corto de la regla ganadora para la insignia de la tarjeta (TIPO:ID). */
export function ruleBadge(regla: string | null | undefined): string {
  switch (regla?.split(':')[0]) {
    case 'PROMOCION':
      return 'Promo';
    case 'COMBO':
      return 'Combo';
    case 'ESCALA':
      return 'Mayoreo';
    default:
      return regla ? 'Oferta' : '';
  }
}

/** Denominaciones del arqueo de la gaveta, de mayor a menor. */
export const ARQUEO_DENOMINATIONS = [20, 10, 5, 1, 0.25] as const;

/** El fondo inicial también se cuenta en monedas de cinco centavos. */
export const APERTURA_DENOMINATIONS = [20, 10, 5, 1, 0.25, 0.05] as const;

/** Total de billetes y monedas contados. Suma en centavos para no arrastrar error de coma flotante. */
export function countedTotal(
  counts: Readonly<Record<number, number>>,
  denominations: readonly number[],
): number {
  const cents = denominations.reduce(
    (sum, value) => sum + Math.round(value * 100) * Math.max(0, counts[value] ?? 0),
    0,
  );
  return cents / 100;
}

/** Total contado en la gaveta al cerrar. */
export function arqueoTotal(counts: Readonly<Record<number, number>>): number {
  return countedTotal(counts, ARQUEO_DENOMINATIONS);
}

/** Fondo inicial contado al abrir la caja. */
export function aperturaTotal(counts: Readonly<Record<number, number>>): number {
  return countedTotal(counts, APERTURA_DENOMINATIONS);
}

/** Texto de una denominación: $20, $1, $0.25, $0.05. */
export function denominationLabel(value: number): string {
  return value < 1 ? `$${value.toFixed(2)}` : `$${value}`;
}
