import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { TokenStorage } from '../services/token-storage';

const PUBLIC_ROUTES = ['/auth/login', '/auth/register', '/products/public'];

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const tokenStorage = inject(TokenStorage);
  const isPublicRoute = PUBLIC_ROUTES.some((route) => req.url.includes(route));

  if (isPublicRoute) {
    return next(req);
  }

  const token = tokenStorage.getToken();
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: { Authorization: `Bearer ${token}` },
  });

  return next(authReq);
};