import { Routes } from '@angular/router';

export const RECIPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/recipe-list/recipe-list').then((m) => m.RecipeList),
    title: 'Recetas',
  },
  {
    path: 'explosion',
    loadComponent: () =>
      import('./pages/material-explosion/material-explosion').then((m) => m.MaterialExplosionPage),
    title: 'Explosión de materiales',
  },
];