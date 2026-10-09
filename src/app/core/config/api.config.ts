import { InjectionToken, Provider } from '@angular/core';
import { environment } from '../../../environments/environment';

export interface ApiConfig {
  /** Sin barra final. */
  readonly baseUrl: string;
  /** Origen del backend, para decidir a quién se le manda el token. */
  readonly origin: string;
  readonly timeoutMs: number;
}

// Como token inyectable para poder sobrescribirlo en los tests.
export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

// Con una ruta relativa el origen es el de la app, así que basta cadena vacía.
function resolveOrigin(baseUrl: string): string {
  try {
    return new URL(baseUrl).origin;
  } catch {
    return '';
  }
}

export function provideApiConfig(): Provider {
  const baseUrl = environment.apiUrl.replace(/\/+$/, '');

  return {
    provide: API_CONFIG,
    useValue: {
      baseUrl,
      origin: resolveOrigin(baseUrl),
      timeoutMs: environment.requestTimeoutMs,
    } satisfies ApiConfig,
  };
}
