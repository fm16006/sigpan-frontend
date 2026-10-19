import { Routes } from '@angular/router';

export const BRANCHES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/branch-list/branch-list').then((m) => m.BranchList),
    title: 'Sucursales',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/branch-detail/branch-detail').then((m) => m.BranchDetail),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/branch-detail/branch-registers').then((m) => m.BranchRegisters),
        title: 'Sucursal · Cajas',
      },
      {
        path: 'usuarios',
        loadComponent: () =>
          import('./pages/branch-detail/branch-users').then((m) => m.BranchUsers),
        title: 'Sucursal · Usuarios',
      },
    ],
  },
];
