import { Supplier } from '../../core/models/purchase.model';
import { filterSuppliers, segmentCounts } from './supplier-view';

function supplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: 1,
    nombre: 'Molinos del Sur',
    contacto: 'Ana Pérez',
    telefono: '2222-0000',
    email: 'ventas@molinos.com',
    nit: '0614-010190-101-2',
    activo: true,
    compras: 3,
    ultimaCompra: '2026-10-10',
    ...overrides,
  };
}

describe('filterSuppliers', () => {
  const list = [
    supplier({ id: 1 }),
    supplier({ id: 2, nombre: 'Lácteos del Valle', contacto: 'Luis', nit: null }),
    supplier({ id: 3, nombre: 'Azúcar Central', activo: false }),
  ];

  it('filtra por estado', () => {
    expect(filterSuppliers(list, '', 'activos').map((s) => s.id)).toEqual([2, 1]);
    expect(filterSuppliers(list, '', 'inactivos').map((s) => s.id)).toEqual([3]);
    expect(filterSuppliers(list, '', 'todos')).toHaveLength(3);
  });

  it('busca por nombre, contacto o NIT sin importar acentos', () => {
    expect(filterSuppliers(list, 'lacteos', 'todos').map((s) => s.id)).toEqual([2]);
    expect(filterSuppliers(list, 'perez', 'todos').map((s) => s.id)).toEqual([3, 1]);
    expect(filterSuppliers(list, '0614-01', 'todos').map((s) => s.id)).toEqual([3, 1]);
  });

  it('ordena por nombre', () => {
    expect(filterSuppliers(list, '', 'todos').map((s) => s.nombre)).toEqual([
      'Azúcar Central',
      'Lácteos del Valle',
      'Molinos del Sur',
    ]);
  });
});

describe('segmentCounts', () => {
  it('cuenta activos e inactivos', () => {
    expect(
      segmentCounts([supplier(), supplier({ id: 2, activo: false }), supplier({ id: 3 })]),
    ).toEqual({ activos: 2, inactivos: 1, todos: 3 });
  });
});
