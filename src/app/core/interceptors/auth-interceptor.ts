import { HttpInterceptorFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { API_CONFIG, ApiConfig } from '../config/api.config';
import { PUBLIC_API_PATHS } from '../constants/api-endpoints';
import { SessionStore } from '../services/session-store';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const XSRF_COOKIE = 'XSRF-TOKEN';
const XSRF_HEADER = 'X-XSRF-TOKEN';

// Solo adjunta credenciales a las peticiones del backend propio.
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const config = inject(API_CONFIG);
  const session = inject(SessionStore);
  const isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  if (!targetsOwnApi(req, config)) {
    return next(req);
  }

  const headers: Record<string, string> = {};
  const token = session.token();

  if (token && !isPublicPath(req, config)) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // Protección CSRF: reenvía la cookie legible como cabecera.
  if (isBrowser && !SAFE_METHODS.has(req.method)) {
    const xsrfToken = readCookie(XSRF_COOKIE);
    if (xsrfToken) {
      headers[XSRF_HEADER] = xsrfToken;
    }
  }

  return next(
    req.clone({
      setHeaders: headers,
      // En SSR no hay cookies y el fetch de Node falla si se piden.
      withCredentials: isBrowser,
    }),
  );
};

function targetsOwnApi(req: HttpRequest<unknown>, config: ApiConfig): boolean {
  // Las relativas las resuelve el propio origen.
  if (!/^https?:\/\//i.test(req.url)) {
    return true;
  }

  try {
    return new URL(req.url).origin === config.origin;
  } catch {
    return false;
  }
}

function isPublicPath(req: HttpRequest<unknown>, config: ApiConfig): boolean {
  const path = pathnameOf(req.url, config);
  return PUBLIC_API_PATHS.some((publicPath) => path.endsWith(publicPath));
}

function pathnameOf(url: string, config: ApiConfig): string {
  try {
    return new URL(url, config.origin || 'http://localhost').pathname;
  } catch {
    return url;
  }
}

function readCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}
