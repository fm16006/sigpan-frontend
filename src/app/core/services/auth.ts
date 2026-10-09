import { Injectable, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, catchError, finalize, of, shareReplay, tap } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiClient } from '../http/api-client';
import { AuthSession, Credentials, RegisterPayload, UserRole } from '../models/user.model';
import { SessionStore } from './session-store';

@Injectable({ providedIn: 'root' })
export class Auth {
  private readonly api = inject(ApiClient);
  private readonly session = inject(SessionStore);
  private readonly router = inject(Router);

  /** Refresco en curso: varios 401 a la vez comparten una sola petición. */
  private refreshInFlight: Observable<AuthSession | null> | null = null;

  readonly user = this.session.user;
  readonly status = this.session.status;
  readonly isAuthenticated = this.session.isAuthenticated;
  readonly role = this.session.role;

  login(credentials: Credentials): Observable<AuthSession> {
    return this.api
      .post<AuthSession>(API_ENDPOINTS.auth.login, credentials)
      .pipe(tap((session) => this.session.set(session)));
  }

  register(payload: RegisterPayload): Observable<AuthSession> {
    return this.api
      .post<AuthSession>(API_ENDPOINTS.auth.register, payload)
      .pipe(tap((session) => this.session.set(session)));
  }

  /** Canjea la cookie de refresh por un token nuevo. Devuelve null si ya no vale. */
  refresh(): Observable<AuthSession | null> {
    this.refreshInFlight ??= this.api.post<AuthSession>(API_ENDPOINTS.auth.refresh).pipe(
      tap((session) => this.session.set(session)),
      catchError(() => {
        this.session.clear();
        return of(null);
      }),
      finalize(() => (this.refreshInFlight = null)),
      shareReplay(1),
    );

    return this.refreshInFlight;
  }

  /** Recupera la sesión al arrancar. Si no hay cookie válida queda como anónimo. */
  restoreSession(): Observable<unknown> {
    return this.refresh();
  }

  /** Limpia el estado local aunque falle la llamada, para no dejar sesión fantasma. */
  logout(redirectTo = '/auth/login'): void {
    this.api
      .post(API_ENDPOINTS.auth.logout)
      .pipe(catchError(() => of(null)))
      .subscribe(() => {
        this.session.clear();
        void this.router.navigateByUrl(redirectTo);
      });
  }

  /** Para cuando el token ya fue rechazado y no hace falta avisar al backend. */
  clearSession(): void {
    this.session.clear();
  }

  hasAnyRole(roles: readonly UserRole[]): boolean {
    return this.session.hasAnyRole(roles);
  }
}
