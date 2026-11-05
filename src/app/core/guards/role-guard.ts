import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { ROLE_HOME, UserRole } from '../models/user.model';
import { Notifications } from '../services/notifications';
import { SessionStore } from '../services/session-store';

/**
 * Restringe una ruta a ciertos roles. Tipado como UserRole[] para que un rol mal escrito no compile.
 * Quien no tiene el rol vuelve a su inicio (el cajero al punto de venta, el bodeguero a inventario...)
 * en lugar de quedar en una página 403. Solo si el propio inicio le es ajeno va a sin-permisos.
 */
export const roleGuard =
  (allowedRoles: readonly UserRole[]): CanActivateFn =>
  (_route, state) => {
    const session = inject(SessionStore);
    const router = inject(Router);

    if (session.hasAnyRole(allowedRoles)) return true;

    const role = session.role();
    const home = role ? ROLE_HOME[role] : null;
    if (!home || pathOf(state.url) === home) return router.createUrlTree(['/sin-permisos']);

    inject(Notifications).info('No tenés acceso a esa sección. Te llevamos a tu inicio.');
    return router.createUrlTree([home]);
  };

function pathOf(url: string): string {
  return url.split(/[?#]/)[0];
}
