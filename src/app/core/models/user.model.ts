import { Id } from './api.model';

export const USER_ROLES = ['ADMIN', 'CASHIER', 'PRODUCTION', 'CUSTOMER'] as const;

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
  readonly name: string;
}

/** El refresh token no viaja aquí: llega como cookie HttpOnly. */
export interface AuthSession {
  readonly accessToken: string;
  /** Segundos de vida del access token. */
  readonly expiresIn: number;
  readonly user: User;
}
