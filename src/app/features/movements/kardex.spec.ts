import { ProductMovement, StockMovement } from '../../core/models/inventory.model';
import { filterKardex, inPeriod, mergeKardex } from './kardex';

const material: StockMovement = {
  id: 1,
  inventarioId: 10,
  materiaPrimaId: 4,
  materiaPrima: 'Harina de trigo',
  tipo: 'ENTRADA',
  cantidad: 50,
  fecha: '2026-10-12T09:05:00',
  motivo: 'Compra',
  documento: 'CCF 000290',
  costoInicial: 1.5,
  costoFinal: 1.5,
};

const product: ProductMovement = {
  id: 1,
  inventarioId: 20,
  productoId: 7,
  producto: 'Concha de vainilla',
  tipo: 'SALIDA',
  cantidad: 2,
  fecha: '2026-10-19T11:20:00',
  motivo: 'Venta',
  costoInicial: 0.26,
  costoFinal: 0.26,
};

describe('mergeKardex', () => {
  const entries = mergeKardex([material], [product]);

  it('une insumos y productos, lo más reciente primero', () => {
    expect(entries.map((entry) => entry.articulo)).toEqual([
      'Concha de vainilla',
      'Harina de trigo',
    ]);
  });

  it('no mezcla ids repetidos entre tablas', () => {
    expect(new Set(entries.map((entry) => entry.key)).size).toBe(2);
  });

  it('enlaza cada línea a la ficha de su artículo', () => {
    expect(entries[0].link).toEqual(['/backoffice/products', 7, 'existencias']);
    expect(entries[1].link).toEqual(['/backoffice/raw-materials', 4]);
  });

  it('los productos no traen documento', () => {
    expect(entries[0].documento).toBeNull();
  });
});

describe('filterKardex', () => {
  const entries = mergeKardex([material], [product]);
  const now = new Date('2026-10-19T12:00:00');
  const all = { query: '', segment: 'todos', period: 'todo' } as const;

  it('filtra por entradas y salidas', () => {
    expect(filterKardex(entries, { ...all, segment: 'entradas' }, now)).toHaveLength(1);
    expect(filterKardex(entries, { ...all, segment: 'salidas' }, now)[0].tipo).toBe('SALIDA');
  });

  it('busca por artículo o documento sin importar mayúsculas', () => {
    expect(filterKardex(entries, { ...all, query: 'ccf 000290' }, now)).toHaveLength(1);
    expect(filterKardex(entries, { ...all, query: 'CONCHA' }, now)).toHaveLength(1);
  });

  it('filtra por período', () => {
    expect(filterKardex(entries, { ...all, period: '7d' }, now)).toHaveLength(1);
    expect(filterKardex(entries, { ...all, period: 'mes' }, now)).toHaveLength(2);
  });
});

describe('inPeriod', () => {
  const now = new Date('2026-10-19T12:00:00');

  it('hoy solo acepta la fecha de hoy', () => {
    expect(inPeriod('2026-10-19T08:00:00', 'hoy', now)).toBe(true);
    expect(inPeriod('2026-10-18T23:00:00', 'hoy', now)).toBe(false);
  });
});
