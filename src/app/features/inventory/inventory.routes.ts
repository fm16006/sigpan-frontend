import { Routes } from '@angular/router';

export const INVENTORY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/inventory-list/inventory-list').then((m) => m.InventoryList),
    title: 'Inventario',
  },
];