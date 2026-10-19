import { PriceScale } from '../../core/models/price-scale.model';
import { baseRangeLabel, buildScaleRows, previewPrice, rangeLabel } from './wholesale-utils';

function scale(id: number, cantidadMinima: number, precioUnitario: number, activo = true): PriceScale {
  return { id, productoId: 1, producto: 'Concha', cantidadMinima, precioUnitario, activo };
}

const TRAMOS = [scale(2, 24, 0.36), scale(1, 12, 0.4)];

describe('buildScaleRows', () => {
  it('ordena por cantidad y deriva el hasta del siguiente tramo', () => {
    const rows = buildScaleRows(TRAMOS);
    expect(rows.map((row) => [row.desde, row.hasta])).toEqual([
      [12, 23],
      [24, null],
    ]);
    expect(rows.map((row) => row.ejemploTotal)).toEqual([4.8, 8.64]);
  });

  it('salta los tramos inactivos al derivar el hasta', () => {
    const rows = buildScaleRows([scale(1, 12, 0.4), scale(2, 24, 0.36, false), scale(3, 48, 0.3)]);
    expect(rows.map((row) => row.hasta)).toEqual([47, null, null]);
  });
});

describe('rangeLabel', () => {
  it('describe cada rango', () => {
    const [a, b] = buildScaleRows(TRAMOS);
    expect(rangeLabel(a)).toBe('12 a 23 unidades');
    expect(rangeLabel(b)).toBe('24 unidades o más');
    expect(rangeLabel(buildScaleRows([scale(1, 12, 0.4, false)])[0])).toBe('Desde 12 unidades');
  });

  it('describe el rango del precio base', () => {
    expect(baseRangeLabel(TRAMOS)).toBe('1 a 11 unidades');
    expect(baseRangeLabel([])).toBe('Todas las cantidades');
  });
});

describe('previewPrice', () => {
  it('cobra el precio base antes del primer tramo', () => {
    expect(previewPrice(1, TRAMOS, 0.45)).toMatchObject({ precioUnitario: 0.45, total: 0.45, tramo: null });
  });

  it('cobra el tramo más alto que alcance la cantidad', () => {
    expect(previewPrice(12, TRAMOS, 0.45)).toMatchObject({ precioUnitario: 0.4, total: 4.8 });
    expect(previewPrice(30, TRAMOS, 0.45)).toMatchObject({ precioUnitario: 0.36, total: 10.8 });
  });

  it('ignora los tramos inactivos', () => {
    const tramos = [scale(1, 12, 0.4, false)];
    expect(previewPrice(12, tramos, 0.45).precioUnitario).toBe(0.45);
  });
});
