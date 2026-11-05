import { ManagedCategory } from '../../core/models/category.model';

export type CategoryFilter = 'todas' | 'activas' | 'inactivas';

/** Categorías que coinciden con el texto (nombre o descripción) y el estado elegido. */
export function filterCategories(
  categories: readonly ManagedCategory[],
  term: string,
  filter: CategoryFilter,
): ManagedCategory[] {
  const text = term.trim().toLowerCase();
  return categories.filter((category) => {
    if (filter === 'activas' && !category.activo) return false;
    if (filter === 'inactivas' && category.activo) return false;
    if (!text) return true;
    return (
      category.nombre.toLowerCase().includes(text) ||
      (category.descripcion ?? '').toLowerCase().includes(text)
    );
  });
}

export function categoryCounts(
  categories: readonly ManagedCategory[],
): Readonly<Record<CategoryFilter, number>> {
  return {
    todas: categories.length,
    activas: categories.filter((category) => category.activo).length,
    inactivas: categories.filter((category) => !category.activo).length,
  };
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** «3 productos», «1 combo», «2 productos y 1 combo»; vacío si la categoría no se usa. */
export function usageText(products: number, combos: number): string {
  const parts = [
    products > 0 ? plural(products, 'producto', 'productos') : '',
    combos > 0 ? plural(combos, 'combo', 'combos') : '',
  ].filter(Boolean);
  return parts.join(' y ');
}

/** Mensaje del diálogo de desactivar: advierte con el número de productos y combos activos que la usan. */
export function deactivateMessage(category: ManagedCategory): string {
  const used = usageText(category.productosActivos, category.combosActivos);
  const base = `Vas a desactivar la categoría «${category.nombre}». No se borra: se puede reactivar cuando quieras y las ventas anteriores no cambian.`;
  return used
    ? `${base} Hoy la usan ${used} activos: siguen donde están, pero ya no podrás elegir esta categoría en productos o combos nuevos.`
    : base;
}

/**
 * Categorías que se pueden elegir en un producto o combo: las activas y, al editar, la que ya tiene
 * aunque se haya desactivado (si no, el selector la perdería en silencio).
 */
export function selectableCategories<T extends { readonly id: number; readonly activo?: boolean }>(
  categories: readonly T[],
  currentId: number | null | undefined,
): T[] {
  return categories.filter((category) => category.activo !== false || category.id === currentId);
}
