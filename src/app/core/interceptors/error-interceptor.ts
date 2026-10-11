import { HttpContextToken, HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { toAppError } from '../http/app-error';
import { Auth } from '../services/auth';
import { Notifications } from '../services/notifications';

/** Evita que un 401 persistente entre en bucle de reintentos. */
const RETRIED = new HttpContextToken<boolean>(() => false);

// Un 401 aquí es la respuesta esperada, no un token caducado.
const AUTH_PATHS: readonly string[] = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.resendVerification,
  API_ENDPOINTS.auth.refresh,
];

/**
 * Normaliza los errores HTTP y renueva el token cuando expira.
 * Va primero en la lista para que el reintento pase de nuevo por authInterceptor.
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(Auth);
  const router = inject(Router);
  const notifications = inject(Notifications);

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

      if (error.kind === 'forbidden') {
        void router.navigate(['/sin-permisos']);
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
