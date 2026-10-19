import { Routes } from '@angular/router';

export const TRANSFERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/transfer-list/transfer-list').then((m) => m.TransferList),
    title: 'Traslados',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/transfer-detail/transfer-detail').then((m) => m.TransferDetail),
    title: 'Traslado',
  },
];
