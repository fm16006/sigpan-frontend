import { Injectable, computed, signal } from '@angular/core';
import { AuthSession, User, UserRole } from '../models/user.model';

export type SessionStatus = 'unknown' | 'authenticated' | 'anonymous';

/**
 * Estado de la sesión. El token se guarda solo en memoria; la persistencia entre
 * recargas la da la cookie de refresh. Sin lógica HTTP, para evitar ciclos.
 */
@Injectable({ providedIn: 'root' })
export class SessionStore {
  private readonly accessToken = signal<string | null>(null);
  private readonly currentUser = signal<User | null>(null);
  private readonly sessionStatus = signal<SessionStatus>('unknown');

  readonly user = this.currentUser.asReadonly();
  readonly status = this.sessionStatus.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionStatus() === 'authenticated');
  readonly role = computed(() => this.currentUser()?.role ?? null);

  token(): string | null {
    return this.accessToken();
  }

  set(session: AuthSession): void {
    this.accessToken.set(session.accessToken);
    this.currentUser.set(session.user);
    this.sessionStatus.set('authenticated');
  }

  clear(): void {
    this.accessToken.set(null);
    this.currentUser.set(null);
    this.sessionStatus.set('anonymous');
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    const role = this.role();
    return role !== null && roles.includes(role);
  }
}
