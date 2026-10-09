import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { UserRole } from '../models/user.model';
import { SessionStore } from '../services/session-store';

/** Restringe una ruta a ciertos roles. Tipado como UserRole[] para que un rol mal escrito no compile. */
export const roleGuard =
  (allowedRoles: readonly UserRole[]): CanActivateFn =>
  () => {
    const session = inject(SessionStore);
    const router = inject(Router);

    return session.hasAnyRole(allowedRoles) ? true : router.createUrlTree(['/sin-permisos']);
  };
