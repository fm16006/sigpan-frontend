import { ApiUser, UserRole } from '../../core/models/user.model';

export type RoleSegment = 'TODOS' | UserRole;

/** Búsqueda por nombre, correo o teléfono, y filtro por rol; ordenado por nombre. */
export function filterUsers(users: readonly ApiUser[], term: string, role: RoleSegment): ApiUser[] {
  const needle = term.trim().toLowerCase();
  return users
    .filter((user) => role === 'TODOS' || user.rol === role)
    .filter(
      (user) =>
        !needle ||
        user.nombre.toLowerCase().includes(needle) ||
        user.email.toLowerCase().includes(needle) ||
        (user.telefono ?? '').toLowerCase().includes(needle),
    )
    .sort((a, b) => a.nombre.localeCompare(b.nombre));
}

/** Cantidad de usuarios por rol, más el total bajo `TODOS`. */
export function countByRole(users: readonly ApiUser[]): Partial<Record<RoleSegment, number>> {
  const counts: Partial<Record<RoleSegment, number>> = { TODOS: users.length };
  for (const user of users) counts[user.rol] = (counts[user.rol] ?? 0) + 1;
  return counts;
}
