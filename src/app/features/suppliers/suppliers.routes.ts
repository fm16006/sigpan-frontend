import { Routes } from '@angular/router';

export const SUPPLIERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/supplier-list/supplier-list').then((m) => m.SupplierList),
    title: 'Proveedores',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/supplier-detail/supplier-detail').then((m) => m.SupplierDetail),
    title: 'Proveedor',
  },
];
