import { Routes } from '@angular/router';

export const COMPANY_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/company-profile/company-profile').then((m) => m.CompanyProfile),
    title: 'Empresa',
  },
];
