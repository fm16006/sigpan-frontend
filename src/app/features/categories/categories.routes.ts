import { Routes } from '@angular/router';

export const CATEGORIES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/category-list/category-list').then((m) => m.CategoryList),
    title: 'Categorías',
  },
];
