import { Routes } from '@angular/router';

export const PURCHASES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/purchase-list/purchase-list').then((m) => m.PurchaseList),
    title: 'Compras',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/purchase-detail/purchase-detail').then((m) => m.PurchaseDetail),
    title: 'Compra',
  },
];
