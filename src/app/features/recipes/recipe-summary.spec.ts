import { FormulaLine } from '../../core/models/production.model';
import { countByFormula, matchesRecipeSearch } from './recipe-summary';

const line = (id: number, formulaId: number): FormulaLine & { formulaId: number } => ({
  id,
  formulaId,
  materiaPrimaId: id,
  materiaPrima: `Insumo ${id}`,
  unidadMedida: 'kg',
  cantidad: 1,
});

describe('countByFormula', () => {
  it('cuenta los insumos de cada receta', () => {
    const counts = countByFormula([line(1, 10), line(2, 10), line(3, 11)]);
    expect(counts.get(10)).toBe(2);
    expect(counts.get(11)).toBe(1);
    expect(counts.get(99)).toBeUndefined();
  });
});

describe('matchesRecipeSearch', () => {
  const formula = { nombre: 'Concha clásica', producto: 'Concha de vainilla' };

  it('busca por receta o por producto', () => {
    expect(matchesRecipeSearch(formula, 'clásica')).toBe(true);
    expect(matchesRecipeSearch(formula, 'VAINILLA')).toBe(true);
    expect(matchesRecipeSearch(formula, 'semita')).toBe(false);
  });

  it('sin texto deja pasar todo', () => {
    expect(matchesRecipeSearch(formula, ' ')).toBe(true);
  });
});
