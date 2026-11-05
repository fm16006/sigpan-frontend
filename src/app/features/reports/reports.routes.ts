import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/report-catalog/report-catalog').then((m) => m.ReportCatalog),
    title: 'Reportes',
  },
  {
    path: ':codigo',
    loadComponent: () => import('./pages/report-detail/report-detail').then((m) => m.ReportDetail),
    title: 'Reporte',
  },
];
