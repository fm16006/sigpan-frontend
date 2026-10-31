import { Routes } from '@angular/router';

export const RAW_MATERIALS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/raw-material-list/raw-material-list').then((m) => m.RawMaterialList),
    title: 'Materia prima',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/raw-material-detail/raw-material-detail').then((m) => m.RawMaterialDetail),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/raw-material-detail/material-summary').then((m) => m.MaterialSummary),
        title: 'Materia prima · Resumen',
      },
      {
        path: 'movimientos',
        loadComponent: () =>
          import('./pages/raw-material-detail/material-kardex').then((m) => m.MaterialKardex),
        title: 'Materia prima · Movimientos',
      },
      {
        path: 'lotes',
        loadComponent: () => import('./pages/raw-material-detail/material-lots').then((m) => m.MaterialLots),
        title: 'Materia prima · Lotes',
      },
      {
        path: 'unidades',
        loadComponent: () => import('./pages/raw-material-detail/material-units').then((m) => m.MaterialUnits),
        title: 'Materia prima · Unidades',
      },
    ],
  },
];
