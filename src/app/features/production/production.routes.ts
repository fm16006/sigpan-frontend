import { Routes } from '@angular/router';

export const PRODUCTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/production-list/production-list').then((m) => m.ProductionList),
    title: 'Órdenes de producción',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/production-detail/production-detail').then((m) => m.ProductionDetail),
    title: 'Orden de producción',
  },
];
