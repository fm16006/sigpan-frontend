import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth-guard';
import { guestGuard } from './core/guards/guest-guard';
import { publicSiteGuard } from './core/guards/public-site-guard';
import { roleGuard } from './core/guards/role-guard';
import { roleHomeGuard } from './core/guards/role-home-guard';
import { STAFF_ROLES } from './core/models/user.model';

export const routes: Routes = [
  {
    path: '',
    canActivate: [publicSiteGuard],
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
    path: 'backoffice/pos',
    canActivate: [authGuard, roleGuard(['ADMINISTRADOR', 'CAJERO'])],
    loadChildren: () => import('./features/pos/pos.routes').then((m) => m.POS_ROUTES),
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
        canActivate: [roleHomeGuard],
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'orders',
        canActivate: [roleGuard(['ADMINISTRADOR', 'DESPACHADOR'])],
        loadChildren: () =>
          import('./features/dispatch/dispatch.routes').then((m) => m.DISPATCH_ROUTES),
      },
      {
        path: 'products',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION'])],
        loadChildren: () =>
          import('./features/products/products.routes').then((m) => m.PRODUCTS_ROUTES),
      },
      {
        // Mismos roles que escriben categorías en el backend (administración y jefe de producción).
        path: 'categories',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION'])],
        loadChildren: () =>
          import('./features/categories/categories.routes').then((m) => m.CATEGORIES_ROUTES),
      },
      // El inventario se repartió entre Materia prima y Movimientos; la ruta vieja redirige.
      { path: 'inventory', redirectTo: 'raw-materials', pathMatch: 'full' },
      {
        path: 'raw-materials',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'])],
        loadChildren: () =>
          import('./features/raw-materials/raw-materials.routes').then(
            (m) => m.RAW_MATERIALS_ROUTES,
          ),
      },
      {
        path: 'stock-control',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'])],
        loadChildren: () =>
          import('./features/stock-control/stock-control.routes').then((m) => m.STOCK_CONTROL_ROUTES),
      },
      {
        path: 'purchases',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'])],
        loadChildren: () =>
          import('./features/purchases/purchases.routes').then((m) => m.PURCHASES_ROUTES),
      },
      {
        path: 'suppliers',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'])],
        loadChildren: () =>
          import('./features/suppliers/suppliers.routes').then((m) => m.SUPPLIERS_ROUTES),
      },
      {
        path: 'movements',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'])],
        loadChildren: () =>
          import('./features/movements/movements.routes').then((m) => m.MOVEMENTS_ROUTES),
      },
      {
        path: 'production',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION'])],
        loadChildren: () =>
          import('./features/production/production.routes').then((m) => m.PRODUCTION_ROUTES),
      },
      {
        path: 'recipes',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION'])],
        loadChildren: () =>
          import('./features/recipes/recipes.routes').then((m) => m.RECIPES_ROUTES),
      },
      {
        path: 'promotions',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () =>
          import('./features/promotions/promotions.routes').then((m) => m.PROMOTIONS_ROUTES),
      },
      {
        path: 'liquidations',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () =>
          import('./features/liquidations/liquidations.routes').then((m) => m.LIQUIDATIONS_ROUTES),
      },
      {
        path: 'combos',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () =>
          import('./features/combos/combos.routes').then((m) => m.COMBOS_ROUTES),
      },
      {
        path: 'wholesale',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () =>
          import('./features/wholesale/wholesale.routes').then((m) => m.WHOLESALE_ROUTES),
      },
      {
        // Mismos roles que admite el backend para al menos un reporte; cada reporte afina por rol.
        path: 'reports',
        canActivate: [roleGuard(['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO', 'DESPACHADOR'])],
        loadChildren: () => import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: 'audit',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () => import('./features/audit/audit.routes').then((m) => m.AUDIT_ROUTES),
      },
      {
        path: 'company',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () => import('./features/company/company.routes').then((m) => m.COMPANY_ROUTES),
      },
      {
        path: 'users',
        canActivate: [roleGuard(['ADMINISTRADOR'])],
        loadChildren: () => import('./features/users/users.routes').then((m) => m.USERS_ROUTES),
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
