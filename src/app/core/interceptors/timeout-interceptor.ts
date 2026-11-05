import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { throwError, timeout } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

/** Corta las peticiones colgadas. Emite estado 0 para que se trate como error de red. */
export const timeoutInterceptor: HttpInterceptorFn = (req, next) => {
  const { timeoutMs } = inject(API_CONFIG);

  return next(req).pipe(
    timeout({
      each: timeoutMs,
      with: () =>
        throwError(
          () => new HttpErrorResponse({ status: 0, statusText: 'Timeout', url: req.url }),
        ),
    }),
  );
};
