import { CatalogProduct } from '../../core/models/catalog.model';
import { Promotion } from '../../core/models/promotion.model';
import {
  countBySegment,
  filterPromotions,
  formatMonth,
  formatShortDate,
  fullMonthOf,
  promotionStatus,
  addToSelection,
  countVisibleSelected,
  filterProducts,
  scopeSummary,
  vigenciaLabel,
} from './promotion-utils';

function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 1,
    nombre: 'Pan del mes',
    descripcion: null,
    tipoDescuento: 'PORCENTAJE',
    valorDescuento: 10,
    fechaInicio: '2026-11-01',
    fechaFin: '2026-11-30',
    prioridad: 0,
    activo: true,
    ...overrides,
  };
}

describe('fullMonthOf', () => {
  it('detecta un mes calendario completo', () => {
    expect(fullMonthOf('2026-11-01', '2026-11-30')).toBe('2026-11');
    expect(fullMonthOf('2026-12-01', '2026-12-31')).toBe('2026-12');
  });

  it('respeta febrero en año bisiesto y no bisiesto', () => {
    expect(fullMonthOf('2028-02-01', '2028-02-29')).toBe('2028-02');
    expect(fullMonthOf('2026-02-01', '2026-02-28')).toBe('2026-02');
    expect(fullMonthOf('2026-02-01', '2026-02-27')).toBeNull();
  });

  it('rechaza rangos parciales, de varios meses o incompletos', () => {
    expect(fullMonthOf('2026-11-02', '2026-11-30')).toBeNull();
    expect(fullMonthOf('2026-11-01', '2026-11-29')).toBeNull();
    expect(fullMonthOf('2026-11-01', '2026-12-31')).toBeNull();
    expect(fullMonthOf(null, '2026-11-30')).toBeNull();
    expect(fullMonthOf('2026-11-01', null)).toBeNull();
  });
});

describe('promotionStatus', () => {
  it('calcula el estado por fecha y activo', () => {
    expect(promotionStatus(promo(), '2026-11-15')).toBe('VIGENTE');
    expect(promotionStatus(promo(), '2026-10-31')).toBe('PROGRAMADA');
    expect(promotionStatus(promo(), '2026-12-01')).toBe('VENCIDA');
    expect(promotionStatus(promo({ activo: false }), '2026-11-15')).toBe('INACTIVA');
  });
});

describe('formato', () => {
  it('formatea fechas y meses en español', () => {
    expect(formatShortDate('2026-05-12')).toBe('12 may 2026');
    expect(formatMonth('2026-11')).toBe('Noviembre 2026');
  });

  it('muestra el mes cuando es completo y el rango en otro caso', () => {
    expect(vigenciaLabel(promo())).toBe('Noviembre 2026');
    expect(vigenciaLabel(promo({ fechaInicio: '2026-11-05', fechaFin: '2026-11-20' }))).toBe(
      '5 nov 2026 — 20 nov 2026',
    );
  });
});

describe('filtros', () => {
  const list = [
    promo({ id: 1, nombre: 'Pan del mes' }),
    promo({ id: 2, nombre: 'Pastel', descripcion: 'Dos por uno', fechaInicio: '2027-01-01', fechaFin: '2027-01-31' }),
    promo({ id: 3, nombre: 'Café', activo: false }),
  ];

  it('filtra por segmento y por texto', () => {
    expect(filterPromotions(list, { segment: 'VIGENTE', term: '' }, '2026-11-10').map((p) => p.id)).toEqual([1]);
    expect(filterPromotions(list, { segment: 'TODAS', term: 'dos por' }, '2026-11-10').map((p) => p.id)).toEqual([2]);
    expect(filterPromotions(list, { segment: 'INACTIVA', term: '' }, '2026-11-10').map((p) => p.id)).toEqual([3]);
  });

  it('cuenta por segmento', () => {
    expect(countBySegment(list, '2026-11-10')).toEqual({
      TODAS: 3,
      VIGENTE: 1,
      PROGRAMADA: 1,
      VENCIDA: 0,
      INACTIVA: 1,
    });
  });
});

describe('scopeSummary', () => {
  it('dice el alcance en lenguaje claro', () => {
    expect(scopeSummary({ alcance: 'TODOS' })).toBe('Todos los productos');
    expect(scopeSummary({ alcance: 'CATEGORIAS', categorias: ['Postres', 'Bebidas'] })).toBe(
      'Categorías: Postres, Bebidas',
    );
    expect(scopeSummary({ alcance: 'CATEGORIAS', categorias: ['Postres'] })).toBe('Categoría: Postres');
    expect(scopeSummary({ alcance: 'PRODUCTOS', productoIds: [1, 2, 3] })).toBe('3 productos');
    expect(scopeSummary({ alcance: 'PRODUCTOS', productoIds: [5] })).toBe('1 producto');
  });

  it('avisa cuando no hay nada elegido', () => {
    expect(scopeSummary({ alcance: 'CATEGORIAS', categorias: [] })).toBe('Sin categorías');
    expect(scopeSummary({ alcance: 'PRODUCTOS', productoIds: [] })).toBe('Sin productos');
  });

  it('una respuesta sin alcance se trata como por productos', () => {
    expect(scopeSummary({ productoIds: [1, 2] })).toBe('2 productos');
    expect(scopeSummary({})).toBe('Sin productos');
  });
});

describe('buscador de productos', () => {
  const product = (id: number, nombre: string, activo = true, categoria = 'Panes') =>
    ({ id, codigo: `P-${id}`, nombre, categoria, activo }) as unknown as CatalogProduct;
  const catalog = [
    product(1, 'Pan francés'),
    product(2, 'Café con leche'),
    product(3, 'PRUEBA-MVEW5GZO BOCADILLOS', false),
    product(4, 'Pastel de tres leches', true, 'Postres'),
  ];

  it('solo ofrece productos activos, también sin término', () => {
    expect(filterProducts(catalog, '').map((p) => p.id)).toEqual([1, 2, 4]);
    expect(filterProducts(catalog, 'prueba')).toEqual([]);
  });

  it('busca por nombre sin importar mayúsculas ni tildes', () => {
    expect(filterProducts(catalog, 'CAFE').map((p) => p.id)).toEqual([2]);
    expect(filterProducts(catalog, 'frances').map((p) => p.id)).toEqual([1]);
    expect(filterProducts(catalog, '  leche ').map((p) => p.id)).toEqual([2, 4]);
  });

  it('busca también por código y por categoría', () => {
    expect(filterProducts(catalog, 'P-4').map((p) => p.id)).toEqual([4]);
    expect(filterProducts(catalog, 'postres').map((p) => p.id)).toEqual([4]);
  });

  it('agrega los filtrados sin perder lo ya marcado', () => {
    const next = addToSelection(new Set([9]), [2, 4]);
    expect([...next].sort()).toEqual([2, 4, 9]);
  });

  it('cuenta solo los seleccionados que se ven', () => {
    expect(countVisibleSelected(new Set([1, 3, 9]), [{ id: 1 }, { id: 2 }])).toBe(1);
  });
});
