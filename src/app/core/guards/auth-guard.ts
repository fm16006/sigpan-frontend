import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionStore } from '../services/session-store';

/**
 * Exige sesión activa. La sesión ya viene restaurada por el inicializador.
 * Los guards son solo de experiencia de usuario: la autorización la impone el backend.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const session = inject(SessionStore);
  const router = inject(Router);

  if (session.isAuthenticated()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
};
