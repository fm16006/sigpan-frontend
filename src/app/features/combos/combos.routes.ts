import { Routes } from '@angular/router';

export const COMBOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/combo-list/combo-list').then((m) => m.ComboList),
    title: 'Combos',
  },
  {
    path: ':id',
    loadComponent: () => import('./pages/combo-detail/combo-detail').then((m) => m.ComboDetail),
    title: 'Combo',
  },
];
