import { Routes } from '@angular/router';

// Provisional: la reemplaza el kárdex del rediseño.
export const MOVEMENTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../inventory/pages/inventory-list/inventory-list').then((m) => m.InventoryList),
    title: 'Movimientos',
  },
];
