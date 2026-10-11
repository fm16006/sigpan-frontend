import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { SessionStore } from '../services/session-store';

/** Quien solo atiende caja entra directo al punto de venta, no al panel. */
export const cashierRedirectGuard: CanActivateFn = () => {
  const session = inject(SessionStore);
  const router = inject(Router);

  return session.role() === 'CAJERO' ? router.createUrlTree(['/backoffice/pos']) : true;
};
