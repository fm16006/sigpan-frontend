import { MaterialExplosionLine } from '../../../../core/models/production.model';
import { cantidadFaltante, insumosFaltantes } from './explosion-summary';

const linea = (overrides: Partial<MaterialExplosionLine>): MaterialExplosionLine => ({
  materiaPrimaId: 1,
  nombre: 'Harina',
  unidadMedida: 'kg',
  cantidadFormula: 4,
  cantidadRequerida: 4.4,
  existencia: 10,
  suficiente: true,
  ...overrides,
});

describe('cantidadFaltante', () => {
  it('es cero cuando el insumo alcanza', () => {
    expect(cantidadFaltante(linea({ suficiente: true }))).toBe(0);
  });

  it('indica cuánto falta cuando no alcanza', () => {
    expect(cantidadFaltante(linea({ cantidadRequerida: 4.4, existencia: 1.5, suficiente: false }))).toBe(2.9);
  });
});

describe('insumosFaltantes', () => {
  it('devuelve solo los insumos que no alcanzan', () => {
    const insumos = [
      linea({ materiaPrimaId: 1, suficiente: true }),
      linea({ materiaPrimaId: 2, suficiente: false }),
    ];

    expect(insumosFaltantes(insumos).map((insumo) => insumo.materiaPrimaId)).toEqual([2]);
  });
});
