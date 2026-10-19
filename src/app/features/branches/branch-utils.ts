import { Branch, Register } from '../../core/models/branch.model';

/** Texto que identifica el lugar de cobro: "Principal · Caja 01". */
export function placeLabel(branch: string | null | undefined, register: string | null | undefined): string {
  return [branch, register].filter((part): part is string => !!part).join(' · ');
}

/** Cajas que pueden cobrar: las activas de una sucursal. */
export function activeRegisters(branch: Pick<Branch, 'cajas'> | null | undefined): readonly Register[] {
  return (branch?.cajas ?? []).filter((register) => register.activo);
}

/** Filtra la lista de sucursales por nombre, código, dirección o teléfono. */
export function filterBranches(branches: readonly Branch[], term: string): Branch[] {
  const needle = term.trim().toLowerCase();
  if (!needle) return [...branches];
  return branches.filter((branch) =>
    [branch.nombre, branch.codigo, branch.direccion ?? '', branch.telefono ?? ''].some((field) =>
      field.toLowerCase().includes(needle),
    ),
  );
}
