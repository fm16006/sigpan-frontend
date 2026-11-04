import { Routes } from '@angular/router';

export const CASH_REGISTERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/point-of-sale-hub/point-of-sale-hub').then((m) => m.PointOfSaleHub),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/register-board/register-board').then((m) => m.RegisterBoard),
        title: 'Punto de venta · Cajas',
      },
      {
        path: 'cortes',
        loadComponent: () =>
          import('./pages/shift-history/shift-history').then((m) => m.ShiftHistory),
        title: 'Punto de venta · Cortes',
      },
    ],
  },
];
