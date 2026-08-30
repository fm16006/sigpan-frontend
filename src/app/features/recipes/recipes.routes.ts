import { Routes } from '@angular/router';

export const RECIPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/recipe-list/recipe-list').then((m) => m.RecipeList),
    title: 'Recetas',
  },
];