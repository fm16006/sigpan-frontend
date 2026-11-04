import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { toAppError } from '../http/app-error';
import { ROLE_HOME } from '../models/user.model';
import { Auth } from '../services/auth';
import { Notifications } from '../services/notifications';
import { SessionStore } from '../services/session-store';

/** Evita que un 401 persistente entre en bucle de reintentos. */
const RETRIED = new HttpContextToken<boolean>(() => false);

// Un 401 aquí es la respuesta esperada, no un token caducado.
const AUTH_PATHS: readonly string[] = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.resendVerification,
  API_ENDPOINTS.auth.refresh,
];

/**
 * DEF-20: aquí un 403 es una regla de negocio (autorización inválida, venta ajena o de otro día),
 * no falta de permisos; el formulario muestra el mensaje y el usuario sigue en la pantalla.
 */
const BUSINESS_FORBIDDEN: readonly RegExp[] = [/\/ventas\/\d+\/anular$/];

/**
 * Normaliza los errores HTTP y renueva el token cuando expira.
 * Va primero en la lista para que el reintento pase de nuevo por authInterceptor.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const notifications = inject(Notifications);
  const session = inject(SessionStore);

  const path = pathnameOf(req.url);
  const isAuthEndpoint =
    AUTH_PATHS.some((authPath) => path.endsWith(authPath)) ||
    (req.method === 'POST' && path.endsWith(API_ENDPOINTS.auth.register));

  return next(req).pipe(
    catchError((response: HttpErrorResponse) => {
      const error = toAppError(response);

      if (error.kind === 'auth' && !isAuthEndpoint && !req.context.get(RETRIED)) {
        req.context.set(RETRIED, true);

        return auth.refresh().pipe(
          switchMap((session) => {
            if (!session) {
              auth.clearSession();
              void router.navigate(['/auth/login'], {
                queryParams: { returnUrl: router.url },
              });
              return throwError(() => error);
            }
            return next(req);
          }),
        );
      }

      if (isAuthEndpoint) {
        return throwError(() => error);
      }

      // Sin permiso para lo que pidió la pantalla: vuelve a su inicio en lugar de una página 403.
      // Si ya está en su inicio, se queda ahí con el aviso (evita un bucle de redirecciones).
      if (error.kind === 'forbidden' && !BUSINESS_FORBIDDEN.some((pattern) => pattern.test(path))) {
        const role = session.role();
        const home = role ? ROLE_HOME[role] : null;
        const current = router.url.split(/[?#]/)[0];
        if (!home) {
          void router.navigate(['/sin-permisos']);
        } else if (current !== home) {
          void router.navigateByUrl(home);
        }
      }

      // Los de validación se muestran en el formulario, el resto como aviso.
      if (error.kind !== 'validation') {
        notifications.error(error.message);
      }

      return throwError(() => error);
    }),
  );
};

function pathnameOf(url: string): string {
  try {
    return new URL(url, 'http://localhost').pathname;
  } catch {
    return url;
  }
}
