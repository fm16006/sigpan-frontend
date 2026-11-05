import { StockRow, isLowStock } from './inventory.model';

const row = (changes: Partial<StockRow>): StockRow => ({
  kind: 'materia-prima',
  itemId: 1,
  inventarioId: 10,
  nombre: 'Harina',
  descripcion: null,
  unidad: 'kg',
  cantidad: 20,
  minimo: 10,
  fechaActualizacion: null,
  ...changes,
});

describe('isLowStock', () => {
  it('marca la existencia por debajo del mínimo', () => {
    expect(isLowStock(row({ cantidad: 5 }))).toBe(true);
  });

  it('marca la existencia igual al mínimo', () => {
    expect(isLowStock(row({ cantidad: 10 }))).toBe(true);
  });

  it('no marca la existencia por encima del mínimo', () => {
    expect(isLowStock(row({ cantidad: 11 }))).toBe(false);
  });

  it('no marca un registro sin inventario habilitado', () => {
    expect(isLowStock(row({ inventarioId: null, cantidad: 0 }))).toBe(false);
  });
});
