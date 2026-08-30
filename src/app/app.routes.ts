import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { roleGuard } from './core/guards/role-guard';
import { cashierRedirectGuard } from './core/guards/cashier-redirect-guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./shared/layout/customer-shell/customer-shell').then((m) => m.CustomerShell),
    children: [
      {
        path: '',
        loadComponent: () => import('./features/home/pages/home/home').then((m) => m.Home),
        title: 'Inicio',
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
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: 'backoffice',
    canActivate: [authGuard, roleGuard(['ADMIN', 'CASHIER', 'PRODUCTION'])],
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
        path: 'inventory',
        canActivate: [roleGuard(['ADMIN', 'PRODUCTION'])],
        loadChildren: () =>
          import('./features/inventory/inventory.routes').then((m) => m.INVENTORY_ROUTES),
      },
      {
        path: 'pos',
        canActivate: [roleGuard(['ADMIN', 'CASHIER'])],
        loadChildren: () => import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
      },
      {
        path: 'promotions',
        canActivate: [roleGuard(['ADMIN'])],
        loadChildren: () =>
          import('./features/promotions/promotions.routes').then((m) => m.PROMOTIONS_ROUTES),
      },
      {
        path: 'recipes',
        canActivate: [roleGuard(['ADMIN', 'PRODUCTION'])],
        loadChildren: () =>
          import('./features/recipes/recipes.routes').then((m) => m.RECIPES_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: '',
  },
];