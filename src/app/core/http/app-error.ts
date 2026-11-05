import { HttpErrorResponse } from '@angular/common/http';
import { ApiErrorBody } from '../models/api.model';

export type AppErrorKind =
  | 'network'
  | 'validation'
  | 'auth'
  | 'locked'
  | 'forbidden'
  | 'notFound'
  | 'conflict'
  | 'server';

/** Error ya interpretado, listo para mostrar en pantalla. */
export interface AppError {
  readonly kind: AppErrorKind;
  readonly status: number;
  readonly message: string;
  /** Código del backend (p. ej. TOTAL_CAMBIO), si lo trae. */
  readonly code?: string;
  /** Errores por campo que informa el backend en un 400 o 422. */
  readonly fieldErrors: Readonly<Record<string, string>>;
  /** Faltantes de existencia que informa el backend (HU-40). */
  readonly shortages?: readonly unknown[];
}

const MESSAGES: Readonly<Record<AppErrorKind, string>> = {
  network: 'No pudimos conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.',
  validation: 'Revisa los datos ingresados.',
  auth: 'Tu sesión expiró. Vuelve a iniciar sesión.',
  locked: 'La cuenta está bloqueada temporalmente. Inténtalo más tarde.',
  forbidden: 'No tienes permisos para realizar esta acción.',
  notFound: 'No encontramos el recurso solicitado.',
  conflict: 'El registro ya existe.',
  server: 'Ocurrió un error inesperado. Inténtalo más tarde.',
};

function kindFor(status: number): AppErrorKind {
  if (status === 0) return 'network';
  if (status === 401) return 'auth';
  if (status === 423) return 'locked';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'notFound';
  if (status === 409) return 'conflict';
  if (status === 400 || status === 422) return 'validation';
  return 'server';
}

export function toAppError(response: HttpErrorResponse): AppError {
  const kind = kindFor(response.status);
  const body: ApiErrorBody | null =
    response.error && typeof response.error === 'object' ? response.error : null;

  return {
    kind,
    status: response.status,
    // En 5xx se ignora el mensaje del backend: puede traer trazas internas.
    message: (kind === 'server' ? null : body?.message) ?? MESSAGES[kind],
    fieldErrors: body?.errors ?? {},
    code: body?.code,
    shortages: body?.faltantes,
  };
}
