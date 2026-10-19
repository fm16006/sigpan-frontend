import { Routes } from '@angular/router';

// Provisional: la reemplaza el módulo Materia prima del rediseño.
export const RAW_MATERIALS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../inventory/pages/inventory-list/inventory-list').then((m) => m.InventoryList),
    title: 'Materia prima',
  },
];
