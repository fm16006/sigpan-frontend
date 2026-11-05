import { Routes } from '@angular/router';

export const WHOLESALE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/price-scale-admin/price-scale-admin').then((m) => m.PriceScaleAdmin),
    title: 'Mayoreo',
  },
];
