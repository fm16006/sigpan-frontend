import { Id } from '../../core/models/api.model';
import { CatalogProduct } from '../../core/models/catalog.model';
import { ComboLine } from '../../core/models/combo.model';
import { ChipTone } from '../../shared/ui/status-chip/status-chip';

/** Por debajo de esta cantidad de combos se avisa que queda poco. */
export const LOW_COMBO_AVAILABILITY = 10;

export type ProductIndex = ReadonlyMap<Id, CatalogProduct>;

export function indexProducts(products: readonly CatalogProduct[]): ProductIndex {
  return new Map(products.map((product) => [product.id, product]));
}

/** Suma de los productos del combo vendidos por separado: precio × cantidad de cada línea. */
export function comboSum(lines: readonly ComboLine[], products: ProductIndex): number {
  const total = lines.reduce(
    (sum, line) => sum + Number(products.get(line.productoId)?.precio ?? 0) * Number(line.cantidad),
    0,
  );
  return Math.round(total * 100) / 100;
}

/** Lo que el cliente se ahorra con el combo; 0 si no hay productos. */
export function comboSaving(sum: number, price: number): number {
  return sum > 0 ? Math.round((sum - price) * 100) / 100 : 0;
}

/** Ahorro como porcentaje entero de la suma por separado. */
export function savingPercent(sum: number, price: number): number {
  return sum > 0 ? Math.round(((sum - price) / sum) * 100) : 0;
}

/** Combos que alcanza a armar una línea: existencia del producto entre su cantidad. */
export function lineAvailability(line: ComboLine, products: ProductIndex): number {
  const stock = Number(products.get(line.productoId)?.disponible ?? 0);
  const quantity = Number(line.cantidad);
  return quantity > 0 ? Math.max(0, Math.floor(stock / quantity)) : 0;
}

/** Combos disponibles: el producto que menos alcanza manda. null si el combo no tiene productos. */
export function comboAvailability(lines: readonly ComboLine[], products: ProductIndex): number | null {
  if (lines.length === 0) {
    return null;
  }
  return Math.min(...lines.map((line) => lineAvailability(line, products)));
}

export function availabilityTone(available: number | null): ChipTone {
  if (available === null) return 'neutral';
  if (available <= 0) return 'bad';
  return available < LOW_COMBO_AVAILABILITY ? 'warn' : 'ok';
}

export function availabilityLabel(available: number | null): string {
  if (available === null) return 'Sin productos';
  if (available <= 0) return 'Agotado';
  return available === 1 ? '1 combo' : `${available} combos`;
}

/** Contenido legible de una línea: "4 × Pan francés". */
export function lineLabel(line: ComboLine): string {
  return `${line.cantidad} × ${line.producto}`;
}
