import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/product-admin/product-admin').then((m) => m.ProductAdmin),
    title: 'Productos',
  },
];
