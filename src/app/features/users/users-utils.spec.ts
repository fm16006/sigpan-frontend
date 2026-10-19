import { ApiUser } from '../../core/models/user.model';
import { countByRole, filterUsers } from './users-utils';

function user(id: number, nombre: string, rol: ApiUser['rol'], extra: Partial<ApiUser> = {}): ApiUser {
  return {
    id,
    nombre,
    email: `${nombre.toLowerCase()}@sigpan.test`,
    telefono: null,
    rolId: 1,
    rol,
    activo: true,
    ...extra,
  };
}

const USERS = [
  user(1, 'Zoila', 'CAJERO', { telefono: '7777-0000' }),
  user(2, 'Ana', 'ADMINISTRADOR'),
  user(3, 'Beto', 'CAJERO'),
];

describe('filterUsers', () => {
  it('ordena por nombre', () => {
    expect(filterUsers(USERS, '', 'TODOS').map((u) => u.nombre)).toEqual(['Ana', 'Beto', 'Zoila']);
  });

  it('filtra por rol', () => {
    expect(filterUsers(USERS, '', 'CAJERO').map((u) => u.id)).toEqual([3, 1]);
  });

  it('busca por nombre, correo o teléfono', () => {
    expect(filterUsers(USERS, 'ana@', 'TODOS').map((u) => u.id)).toEqual([2]);
    expect(filterUsers(USERS, '7777', 'TODOS').map((u) => u.id)).toEqual([1]);
    expect(filterUsers(USERS, 'beto', 'CAJERO').map((u) => u.id)).toEqual([3]);
  });
});

describe('countByRole', () => {
  it('cuenta por rol y el total', () => {
    expect(countByRole(USERS)).toEqual({ TODOS: 3, CAJERO: 2, ADMINISTRADOR: 1 });
  });
});
