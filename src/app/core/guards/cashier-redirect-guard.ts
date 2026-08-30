import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Auth } from '../services/auth';

export const cashierRedirectGuard: CanActivateFn = () => {
  const auth = inject(Auth);
  const router = inject(Router);

  const isCashierOnly = auth.hasAnyRole(['CASHIER']) && !auth.hasAnyRole(['ADMIN']);

  if (isCashierOnly) {
    return router.createUrlTree(['/backoffice/pos']);
  }

  return true;
};