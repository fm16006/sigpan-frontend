import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionStore } from '../services/session-store';

/** Mantiene login y registro fuera del alcance de quien ya inició sesión. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return session.isAuthenticated() ? router.createUrlTree(['/']) : true;
};
