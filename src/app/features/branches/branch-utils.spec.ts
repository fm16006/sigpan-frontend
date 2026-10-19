import { Branch } from '../../core/models/branch.model';
import { activeRegisters, filterBranches, placeLabel } from './branch-utils';

function branch(id: number, nombre: string, extra: Partial<Branch> = {}): Branch {
  return {
    id,
    nombre,
    codigo: nombre.slice(0, 3).toUpperCase(),
    direccion: null,
    telefono: null,
    horario: null,
    activo: true,
    cantidadUsuarios: 0,
    cajas: [],
    ...extra,
  };
}

describe('placeLabel', () => {
  it('une sucursal y caja', () => {
    expect(placeLabel('Principal', 'Caja 01')).toBe('Principal · Caja 01');
  });

  it('omite lo que falta', () => {
    expect(placeLabel(null, 'Caja 01')).toBe('Caja 01');
    expect(placeLabel('Principal', undefined)).toBe('Principal');
    expect(placeLabel('', null)).toBe('');
  });
});

describe('activeRegisters', () => {
  it('deja solo las cajas activas', () => {
    const principal = branch(1, 'Principal', {
      cajas: [
        { id: 1, sucursalId: 1, nombre: 'Caja 01', codigo: 'C01', activo: true },
        { id: 2, sucursalId: 1, nombre: 'Caja 02', codigo: 'C02', activo: false },
      ],
    });

    expect(activeRegisters(principal).map((register) => register.id)).toEqual([1]);
  });

  it('sin sucursal no hay cajas', () => {
    expect(activeRegisters(undefined)).toEqual([]);
    expect(activeRegisters(null)).toEqual([]);
  });
});

describe('filterBranches', () => {
  const branches = [
    branch(1, 'Principal', { direccion: 'San Salvador' }),
    branch(2, 'Norte', { telefono: '2222-0000' }),
  ];

  it('sin búsqueda devuelve todas', () => {
    expect(filterBranches(branches, '  ')).toHaveLength(2);
  });

  it('busca por nombre, código, dirección o teléfono sin importar mayúsculas', () => {
    expect(filterBranches(branches, 'norte').map((b) => b.id)).toEqual([2]);
    expect(filterBranches(branches, 'PRI').map((b) => b.id)).toEqual([1]);
    expect(filterBranches(branches, 'salvador').map((b) => b.id)).toEqual([1]);
    expect(filterBranches(branches, '2222').map((b) => b.id)).toEqual([2]);
    expect(filterBranches(branches, 'zzz')).toEqual([]);
  });
});
