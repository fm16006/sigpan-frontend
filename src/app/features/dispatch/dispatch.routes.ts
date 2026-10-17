import { Routes } from '@angular/router';

export const DISPATCH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/order-queue/order-queue').then((m) => m.OrderQueue),
    title: 'Pedidos en línea',
  },
];
