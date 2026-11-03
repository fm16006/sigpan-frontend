import { Routes } from '@angular/router';

export const CASH_REGISTERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/register-board/register-board').then((m) => m.RegisterBoard),
    title: 'Cajas',
  },
];
