import { Routes } from '@angular/router';

export const PROMOTIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/promotion-list/promotion-list').then((m) => m.PromotionList),
    title: 'Promociones',
  },
];