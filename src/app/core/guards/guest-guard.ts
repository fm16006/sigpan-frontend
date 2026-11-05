import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ROLE_HOME } from '../models/user.model';
import { SessionStore } from '../services/session-store';

/** Mantiene login y registro fuera del alcance de quien ya inició sesión. */
export const guestGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  const role = session.role();
  return session.isAuthenticated() && role ? router.createUrlTree([ROLE_HOME[role]]) : true;
};
