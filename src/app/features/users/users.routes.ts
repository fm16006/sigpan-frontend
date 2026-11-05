import { Routes } from '@angular/router';

export const USERS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/user-admin/user-admin').then((m) => m.UserAdmin),
    title: 'Usuarios',
  },
];
