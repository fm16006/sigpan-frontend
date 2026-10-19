import { Routes } from '@angular/router';

export const COMBOS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/combo-admin/combo-admin').then((m) => m.ComboAdmin),
    title: 'Combos',
  },
];
