import { Routes } from '@angular/router';

export const STOCK_CONTROL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/stock-alerts').then((m) => m.StockAlerts),
    title: 'Alertas de inventario',
  },
  {
    path: 'tomas',
    loadComponent: () => import('./pages/physical-counts').then((m) => m.PhysicalCounts),
    title: 'Toma física',
  },
];
