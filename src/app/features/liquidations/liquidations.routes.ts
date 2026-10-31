import { Routes } from '@angular/router';

export const LIQUIDATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/liquidation-list/liquidation-list').then((m) => m.LiquidationList),
    title: 'Liquidaciones',
  },
];
