import { CatalogProduct } from '../../core/models/catalog.model';
import { ComboLine } from '../../core/models/combo.model';
import {
  availabilityLabel,
  availabilityTone,
  comboAvailability,
  comboSaving,
  comboSum,
  indexProducts,
  lineAvailability,
  lineLabel,
  savingPercent,
} from './combo-summary';

const product = (id: number, precio: number, disponible: number | null): CatalogProduct =>
  ({ id, nombre: `P${id}`, precio, disponible }) as CatalogProduct;

const line = (productoId: number, cantidad: number): ComboLine => ({
  id: productoId,
  comboId: 1,
  combo: 'Combo',
  productoId,
  producto: `P${productoId}`,
  cantidad,
});

const products = indexProducts([product(1, 0.25, 36), product(2, 0.85, 48), product(3, 1.2, 0)]);

describe('comboSum', () => {
  it('suma precio por cantidad de cada línea', () => {
    expect(comboSum([line(1, 4), line(2, 1)], products)).toBe(1.85);
  });

  it('es cero sin líneas', () => {
    expect(comboSum([], products)).toBe(0);
  });
});

describe('ahorro', () => {
  it('es la diferencia entre la suma y el precio', () => {
    expect(comboSaving(1.85, 1.5)).toBe(0.35);
    expect(savingPercent(1.85, 1.5)).toBe(19);
  });

  it('es cero cuando no hay suma', () => {
    expect(comboSaving(0, 1.5)).toBe(0);
    expect(savingPercent(0, 1.5)).toBe(0);
  });
});

describe('disponibilidad', () => {
  it('cada línea alcanza para existencia entre cantidad, hacia abajo', () => {
    expect(lineAvailability(line(1, 5), products)).toBe(7);
  });

  it('el combo alcanza lo que el producto más escaso permita', () => {
    expect(comboAvailability([line(1, 2), line(2, 1)], products)).toBe(18);
  });

  it('un producto sin existencia agota el combo', () => {
    expect(comboAvailability([line(1, 1), line(3, 1)], products)).toBe(0);
  });

  it('un combo sin productos no tiene disponibilidad', () => {
    expect(comboAvailability([], products)).toBeNull();
  });

  it('un producto que no está en la lista cuenta como sin existencia', () => {
    expect(comboAvailability([line(99, 1)], products)).toBe(0);
  });

  it('elige el tono y el texto del chip', () => {
    expect(availabilityTone(0)).toBe('bad');
    expect(availabilityTone(7)).toBe('warn');
    expect(availabilityTone(18)).toBe('ok');
    expect(availabilityTone(null)).toBe('neutral');
    expect(availabilityLabel(0)).toBe('Agotado');
    expect(availabilityLabel(1)).toBe('1 combo');
    expect(availabilityLabel(18)).toBe('18 combos');
    expect(availabilityLabel(null)).toBe('Sin productos');
  });
});

describe('lineLabel', () => {
  it('muestra cantidad y producto', () => {
    expect(lineLabel(line(1, 4))).toBe('4 × P1');
  });
});
