import { Id } from './api.model';

export const USER_ROLES = ['ADMIN', 'CAJERO', 'PRODUCCION', 'CLIENTE'] as const;

export type UserRole = (typeof USER_ROLES)[number];

export interface User {
  readonly id: Id;
  readonly name: string;
  readonly email: string;
  readonly role: UserRole;
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
