import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { cashierRedirectGuard } from './core/guards/cashier-redirect-guard';
import { guestGuard } from './core/guards/guest-guard';
import { roleGuard } from './core/guards/role-guard';

const STAFF_ROLES = ['ADMIN', 'CASHIER', 'PRODUCTION'] as const;

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/customer-shell/customer-shell').then((m) => m.CustomerShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
        title: 'SigPan · Panadería artesanal',
      },
      {
        path: 'storefront',
        loadChildren: () =>
          import('./features/storefront/storefront.routes').then((m) => m.STOREFRONT_ROUTES),
      },
    ],
  },
  {
    path: 'auth',
    canActivate: [guestGuard],
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'backoffice',
    // authGuard antes que roleGuard: sin sesión el destino es el login, no un 403.
    canActivate: [authGuard, roleGuard(STAFF_ROLES)],
    loadComponent: () =>
      import('./shared/layout/backoffice-shell/backoffice-shell').then((m) => m.BackofficeShell),
    children: [
      {
        path: '',
        canActivate: [cashierRedirectGuard],
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'pos',
        canActivate: [roleGuard(['ADMIN', 'CASHIER'])],
        loadChildren: () => import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
      },
      {
        path: 'inventory',
        canActivate: [roleGuard(['ADMIN', 'PRODUCTION'])],
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'recipes',
        canActivate: [roleGuard(['ADMIN', 'PRODUCTION'])],
        loadChildren: () =>
          import('./features/recipes/recipes.routes').then((m) => m.RECIPES_ROUTES),
      },
      {
        path: 'promotions',
        canActivate: [roleGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/promotions/promotions.routes').then((m) => m.PROMOTIONS_ROUTES),
      },
    ],
  },
  {
    path: 'sin-permisos',
    loadComponent: () => import('./features/errors/pages/error-page').then((m) => m.ErrorPage),
    title: 'Sin permisos',
    data: {
      code: '403',
      heading: 'No tenés acceso a esta sección',
      message: 'Tu cuenta no cuenta con los permisos necesarios. Consultá con la administración.',
    },
  },
  {
    // Un 404 explícito en lugar de redirigir a la portada.
    path: '**',
    loadComponent: () => import('./features/errors/pages/error-page').then((m) => m.ErrorPage),
    title: 'Página no encontrada',
  },
];
