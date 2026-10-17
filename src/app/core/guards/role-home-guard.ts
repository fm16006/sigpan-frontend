import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ROLE_HOME } from '../models/user.model';
import { SessionStore } from '../services/session-store';

// El panel general es del administrador; el resto entra directo a su módulo.
export const roleHomeGuard: CanActivateFn = () => {
  const role = inject(SessionStore).role();

  return role && role !== 'ADMINISTRADOR'
    ? inject(Router).createUrlTree([ROLE_HOME[role]])
    : true;
};
