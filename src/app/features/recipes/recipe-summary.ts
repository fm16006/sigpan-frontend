import { Formula, FormulaLine } from '../../core/models/production.model';

/** Cantidad de insumos de cada receta, por id de receta. */
export function countByFormula(lines: readonly (FormulaLine & { readonly formulaId?: number })[]): Map<number, number> {
  const counts = new Map<number, number>();
  for (const line of lines) {
    if (line.formulaId !== undefined) {
      counts.set(line.formulaId, (counts.get(line.formulaId) ?? 0) + 1);
    }
  }
  return counts;
}

/** Coincide por nombre de la receta o del producto. */
export function matchesRecipeSearch(formula: Pick<Formula, 'nombre' | 'producto'>, term: string): boolean {
  const query = term.trim().toLowerCase();
  return (
    !query ||
    formula.nombre.toLowerCase().includes(query) ||
    formula.producto.toLowerCase().includes(query)
  );
}
