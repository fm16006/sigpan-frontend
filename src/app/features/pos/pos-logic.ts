import { CatalogProduct } from '../../core/models/catalog.model';
import { PosCombo } from '../../core/models/combo.model';
import { PriceScale } from '../../core/models/price-scale.model';
import { MoneyPipe } from '../../shared/pipes/money.pipe';
import { PosLine } from './models/checkout.model';

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

/** Categoría donde se muestran los combos que no tienen una propia. */
export const COMBOS_CATEGORY = 'Combos';

/** Categoría con la que un combo aparece en la cuadrícula del punto de venta. */
export function comboCategory(combo: Pick<PosCombo, 'categoria'>): string {
  return combo.categoria?.trim() || COMBOS_CATEGORY;
}

/** Lo que muestra la cuadrícula del punto de venta: un producto o un combo, con su categoría. */
export type PosTile =
  | { readonly kind: 'product'; readonly category: string; readonly product: CatalogProduct }
  | { readonly kind: 'combo'; readonly category: string; readonly combo: PosCombo };

/**
 * Categorías de la cuadrícula: las de los productos y las de los combos. Una categoría que solo
 * tiene combos también aparece, y los combos sin categoría suman «Combos».
 */
export function posCategories(
  products: readonly CatalogProduct[],
  combos: readonly PosCombo[],
): string[] {
  return [
    ...new Set([
      ...products.map((product) => product.categoria),
      ...combos.map((combo) => comboCategory(combo)),
    ]),
  ].sort((a, b) => a.localeCompare(b));
}

/**
 * Productos y combos que coinciden con el texto y la categoría elegida, agrupados por categoría.
 * Los combos se buscan por nombre; dentro de una categoría van antes que los productos.
 */
export function posTiles(
  products: readonly CatalogProduct[],
  combos: readonly PosCombo[],
  term: string,
  category: string,
): PosTile[] {
  const text = term.trim().toLowerCase();
  const comboTiles: PosTile[] = combos
    .filter((combo) => !category || comboCategory(combo) === category)
    .filter((combo) => !text || combo.nombre.toLowerCase().includes(text))
    .map((combo) => ({ kind: 'combo', category: comboCategory(combo), combo }));
  const productTiles: PosTile[] = filterProducts(products, term, category).map((product) => ({
    kind: 'product',
    category: product.categoria,
    product,
  }));
  const name = (tile: PosTile) => (tile.kind === 'combo' ? tile.combo.nombre : tile.product.nombre);

  return [...comboTiles, ...productTiles].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      (a.kind === b.kind ? 0 : a.kind === 'combo' ? -1 : 1) ||
      name(a).localeCompare(name(b)),
  );
}

/** Contenido del combo para la tarjeta: «2 × Pan francés · 1 × Café». */
export function comboContents(combo: PosCombo): string {
  return combo.lineas.map((line) => `${line.cantidad} × ${line.producto}`).join(' · ');
}

/** El combo no alcanza ni una vez con la existencia. */
export function comboSoldOut(combo: Pick<PosCombo, 'disponible'>): boolean {
  return combo.disponible <= 0;
}

/** Productos que se agregan al pedido al tocar un combo, o el motivo por el que no se puede. */
export interface ComboAddition {
  readonly lines: readonly PosLine[];
  readonly error: string | null;
}

/**
 * Expande un combo en todos sus productos con sus cantidades. El motor de promociones del backend
 * reconoce la canasta completa y aplica el precio del combo al cotizar; aquí solo se arma el pedido.
 * Falla sin agregar nada si algún producto no está en el catálogo del punto de venta o no alcanza
 * la existencia sumando lo que el pedido ya tiene.
 */
export function planComboAdd(
  combo: PosCombo,
  products: readonly CatalogProduct[],
  ticket: readonly PosLine[],
): ComboAddition {
  if (comboSoldOut(combo)) {
    return { lines: [], error: `${combo.nombre} está agotado.` };
  }

  const byId = new Map(products.map((product) => [product.id, product] as const));
  const lines: PosLine[] = [];
  for (const line of combo.lineas) {
    const product = byId.get(line.productoId);
    if (!product) {
      return { lines: [], error: `${line.producto} no está habilitado en el punto de venta.` };
    }
    const inTicket = ticket.find((item) => item.product.id === product.id)?.quantity ?? 0;
    const stock = product.disponible;
    if (product.agotado || (stock != null && stock <= 0)) {
      return { lines: [], error: `${product.nombre} está agotado.` };
    }
    if (stock != null && inTicket + line.cantidad > stock) {
      return {
        lines: [],
        error: `No alcanza ${product.nombre} para otro ${combo.nombre}: solo quedan ${stock} en existencia.`,
      };
    }
    lines.push({ product, quantity: line.cantidad });
  }
  return { lines, error: null };
}

/** Suma las líneas nuevas al pedido: si el producto ya estaba, se suma la cantidad; si no, se agrega. */
export function mergeLines(ticket: readonly PosLine[], additions: readonly PosLine[]): PosLine[] {
  const merged = [...ticket];
  for (const addition of additions) {
    const index = merged.findIndex((line) => line.product.id === addition.product.id);
    if (index >= 0) {
      merged[index] = { ...merged[index], quantity: merged[index].quantity + addition.quantity };
    } else {
      merged.push(addition);
    }
  }
  return merged;
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
