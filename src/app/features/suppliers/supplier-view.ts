import { Supplier } from '../../core/models/purchase.model';

export type SupplierSegment = 'activos' | 'inactivos' | 'todos';

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda por nombre, contacto o NIT, filtrada por estado y ordenada por nombre. */
export function filterSuppliers(
  suppliers: readonly Supplier[],
  term: string,
  segment: SupplierSegment,
): Supplier[] {
  const query = normalize(term);
  return suppliers
    .filter((supplier) => segment === 'todos' || supplier.activo === (segment === 'activos'))
    .filter(
      (supplier) =>
        !query ||
        normalize(`${supplier.nombre} ${supplier.contacto} ${supplier.nit ?? ''}`).includes(query),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

export function segmentCounts(suppliers: readonly Supplier[]): Readonly<Record<SupplierSegment, number>> {
  const activos = suppliers.filter((supplier) => supplier.activo).length;
  return { activos, inactivos: suppliers.length - activos, todos: suppliers.length };
}
