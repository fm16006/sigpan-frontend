import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ROLE_HOME, canSeePublicSite } from '../models/user.model';
import { SessionStore } from '../services/session-store';

// Caja, despacho, bodega y producción no navegan el sitio público.
export const publicSiteGuard: CanActivateFn = () => {
  const role = inject(SessionStore).role();

  return canSeePublicSite(role) ? true : inject(Router).createUrlTree([ROLE_HOME[role!]]);
};
