import { Routes } from '@angular/router';

export const POS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/pos-screen/pos-screen').then((m) => m.PosScreen),
    title: 'Punto de venta',
  },
];