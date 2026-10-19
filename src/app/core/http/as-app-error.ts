import { HttpErrorResponse } from '@angular/common/http';
import { AppError, toAppError } from './app-error';

/**
 * Lo que llega a un `error:` de suscripción. El errorInterceptor ya lo convirtió en AppError
 * (con los errores por campo del backend); si no pasó por él, es un HttpErrorResponse crudo.
 * Pasar un AppError por `toAppError` perdería los mensajes del backend.
 */
export function asAppError(error: unknown): AppError {
  if (error && typeof error === 'object' && 'kind' in error && 'fieldErrors' in error) {
    return error as AppError;
  }
  return toAppError(error as HttpErrorResponse);
}
