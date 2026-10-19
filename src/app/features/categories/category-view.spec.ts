import { ManagedCategory } from '../../core/models/category.model';
import {
  categoryCounts,
  deactivateMessage,
  filterCategories,
  selectableCategories,
  usageText,
} from './category-view';

function category(overrides: Partial<ManagedCategory> & Pick<ManagedCategory, 'id' | 'nombre'>): ManagedCategory {
  return {
    descripcion: null,
    activo: true,
    productos: 0,
    productosActivos: 0,
    combos: 0,
    combosActivos: 0,
    ...overrides,
  };
}

const LIST = [
  category({ id: 1, nombre: 'Pan dulce', productos: 5, productosActivos: 4 }),
  category({ id: 2, nombre: 'Promociones', descripcion: 'Combos del mes', combos: 2, combosActivos: 2 }),
  category({ id: 3, nombre: 'Temporada vieja', activo: false }),
];

describe('filterCategories', () => {
  it('busca por nombre o descripción sin distinguir mayúsculas', () => {
    expect(filterCategories(LIST, 'PAN', 'todas').map((c) => c.id)).toEqual([1]);
    expect(filterCategories(LIST, 'del mes', 'todas').map((c) => c.id)).toEqual([2]);
  });

  it('filtra por estado', () => {
    expect(filterCategories(LIST, '', 'activas').map((c) => c.id)).toEqual([1, 2]);
    expect(filterCategories(LIST, '', 'inactivas').map((c) => c.id)).toEqual([3]);
    expect(filterCategories(LIST, '', 'todas')).toHaveLength(3);
  });

  it('cuenta por estado', () => {
    expect(categoryCounts(LIST)).toEqual({ todas: 3, activas: 2, inactivas: 1 });
  });
});

describe('usageText', () => {
  it('nombra productos y combos con su plural', () => {
    expect(usageText(3, 0)).toBe('3 productos');
    expect(usageText(0, 1)).toBe('1 combo');
    expect(usageText(1, 2)).toBe('1 producto y 2 combos');
    expect(usageText(0, 0)).toBe('');
  });
});

describe('deactivateMessage', () => {
  it('advierte con el número de productos y combos activos que la usan', () => {
    const text = deactivateMessage(category({ id: 1, nombre: 'Pan dulce', productosActivos: 4, combosActivos: 1 }));

    expect(text).toContain('«Pan dulce»');
    expect(text).toContain('4 productos y 1 combo activos');
    expect(text).toContain('No se borra');
  });

  it('sin uso solo explica que no se borra', () => {
    const text = deactivateMessage(category({ id: 3, nombre: 'Vacía' }));

    expect(text).not.toContain('Hoy la usan');
    expect(text).toContain('se puede reactivar');
  });
});

describe('selectableCategories', () => {
  const options = [
    { id: 1, nombre: 'Activa', activo: true },
    { id: 2, nombre: 'Inactiva', activo: false },
    { id: 3, nombre: 'Sin dato' },
  ];

  it('deja solo las activas', () => {
    expect(selectableCategories(options, null).map((c) => c.id)).toEqual([1, 3]);
  });

  it('conserva la categoría actual aunque esté inactiva', () => {
    expect(selectableCategories(options, 2).map((c) => c.id)).toEqual([1, 2, 3]);
  });
});
