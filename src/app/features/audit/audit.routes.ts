import { Routes } from '@angular/router';

export const AUDIT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/audit-log/audit-log').then((m) => m.AuditLogPage),
    title: 'Bitácora',
  },
];
