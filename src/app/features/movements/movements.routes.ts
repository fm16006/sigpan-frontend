import { Routes } from '@angular/router';

export const MOVEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/movements-list/movements-list').then((m) => m.MovementsList),
    title: 'Movimientos',
  },
];
