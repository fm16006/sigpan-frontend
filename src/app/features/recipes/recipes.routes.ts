import { Routes } from '@angular/router';

export const RECIPES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/recipe-list/recipe-list').then((m) => m.RecipeList),
    title: 'Recetas',
  },
  // La explosión de materiales ahora vive en "Nueva orden" (Producción).
  { path: 'explosion', redirectTo: '/backoffice/production', pathMatch: 'full' },
];
