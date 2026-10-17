import { Routes } from '@angular/router';

export const PRODUCTION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/production-list/production-list').then((m) => m.ProductionList),
    title: 'Producción',
  },
];
