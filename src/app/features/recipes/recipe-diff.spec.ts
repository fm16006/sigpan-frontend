import { FormulaVersion } from '../../core/models/production.model';
import { diffVersions } from './recipe-diff';

const version = (n: number, detalles: [number, string, number][]): FormulaVersion => ({
  formulaId: 1,
  version: n,
  vigenteDesde: '',
  vigenteHasta: null,
  vigente: false,
  usuario: null,
  contenido: {
    nombre: 'Pan',
    cantidadProduccion: 10,
    porcentajeMerma: 0,
    detalles: detalles.map(([materiaPrimaId, materiaPrima, cantidad]) => ({ materiaPrimaId, materiaPrima, cantidad, unidadMedida: 'kg' })),
  },
});

describe('diffVersions', () => {
  it('marca agregados, quitados y cambios', () => {
    const rows = diffVersions(
      version(1, [[1, 'Harina', 2], [2, 'Sal', 0.1]]),
      version(2, [[1, 'Harina', 2.5], [3, 'Azúcar', 0.3]]),
    );
    expect(rows.map((r) => [r.materiaPrima, r.cambio])).toEqual([
      ['Azúcar', 'agregado'],
      ['Harina', 'cambiado'],
      ['Sal', 'quitado'],
    ]);
  });
});
