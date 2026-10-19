import { Id } from './api.model';

export const USER_ROLES = [
  'ADMINISTRADOR',
  'JEFE_PRODUCCION',
  'BODEGUERO',
  'CAJERO',
  'DESPACHADOR',
  'CLIENTE',
] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  readonly id: Id;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
  /** Sucursal del personal; null o ausente para los clientes. */
  readonly sucursalId?: Id | null;
  readonly sucursal?: string | null;
}

export interface Credentials {
  readonly email: string;
  readonly password: string;
}

export interface RegisterPayload extends Credentials {
  readonly nombre: string;
  readonly telefono?: string;
}

export interface ApiUser {
  readonly id: Id;
  readonly nombre: string;
  readonly email: string;
  readonly telefono: string | null;
  readonly rolId: Id;
  readonly rol: UserRole;
  readonly activo: boolean;
  /** Sucursal del personal; null o ausente para los clientes. */
  readonly sucursalId?: Id | null;
  readonly sucursal?: string | null;
}

export interface ApiSession {
  readonly tokenAcceso: string;
  readonly tipoToken: string;
  readonly expiraEn: number;
  readonly usuario: ApiUser;
}

export function toAuthSession(session: ApiSession): AuthSession {
  return {
    accessToken: session.tokenAcceso,
    expiresIn: session.expiraEn,
    user: {
      id: session.usuario.id,
      name: session.usuario.nombre,
      email: session.usuario.email,
      role: session.usuario.rol,
      sucursalId: session.usuario.sucursalId ?? null,
      sucursal: session.usuario.sucursal ?? null,
    },
  };
}

/** El refresh token no viaja aquí: llega como cookie HttpOnly. */
export interface AuthSession {
  readonly accessToken: string;
  /** Segundos de vida del access token. */
  readonly expiresIn: number;
  readonly user: User;
}

export const STAFF_ROLES: readonly UserRole[] = [
  'ADMINISTRADOR',
  'JEFE_PRODUCCION',
  'BODEGUERO',
  'CAJERO',
  'DESPACHADOR',
];

export const ROLE_LABELS: Readonly<Record<UserRole, string>> = {
  ADMINISTRADOR: 'Administración',
  JEFE_PRODUCCION: 'Jefe de producción',
  BODEGUERO: 'Bodega',
  CAJERO: 'Caja',
  DESPACHADOR: 'Despacho',
  CLIENTE: 'Cliente',
};

// Pantalla de inicio de cada rol después del login.
export const ROLE_HOME: Readonly<Record<UserRole, string>> = {
  ADMINISTRADOR: '/backoffice',
  JEFE_PRODUCCION: '/backoffice/products',
  BODEGUERO: '/backoffice/inventory',
  CAJERO: '/backoffice/pos',
  DESPACHADOR: '/backoffice/orders',
  CLIENTE: '/',
};

export function canSeePublicSite(role: UserRole | null): boolean {
  return role === null || role === 'CLIENTE' || role === 'ADMINISTRADOR';
}
