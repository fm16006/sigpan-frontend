import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_CONFIG } from '../config/api.config';

/** Valores de query string; undefined y null se descartan. */
export type QueryParams = Record<string, string | number | boolean | undefined | null>;

/** Centraliza la URL base y los parámetros, para no repetirlos en cada servicio. */
@Injectable({ providedIn: 'root' })
export class ApiClient {
  private readonly http = inject(HttpClient);
  private readonly config = inject(API_CONFIG);

  /** URL absoluta. httpResource la necesita así. */
  url(path: string, params?: QueryParams): string {
    const query = toHttpParams(params).toString();
    return `${this.config.baseUrl}${path}${query ? `?${query}` : ''}`;
  }

  get<T>(path: string, params?: QueryParams): Observable<T> {
    return this.http.get<T>(this.url(path), { params: toHttpParams(params) });
  }

  post<T>(path: string, body?: unknown): Observable<T> {
    return this.http.post<T>(this.url(path), body ?? {});
  }

  put<T>(path: string, body: unknown): Observable<T> {
    return this.http.put<T>(this.url(path), body);
  }

  patch<T>(path: string, body: unknown, params?: QueryParams): Observable<T> {
    return this.http.patch<T>(this.url(path), body, { params: toHttpParams(params) });
  }

  delete<T>(path: string): Observable<T> {
    return this.http.delete<T>(this.url(path));
  }
}

export function toHttpParams(params?: QueryParams): HttpParams {
  let httpParams = new HttpParams();
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== '') {
      httpParams = httpParams.set(key, String(value));
    }
  }
  return httpParams;
}
