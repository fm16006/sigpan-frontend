import { Routes } from '@angular/router';

export const PRODUCTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/product-list/product-list').then((m) => m.ProductList),
    title: 'Productos',
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/product-detail/product-detail').then((m) => m.ProductDetail),
    children: [
      {
        path: '',
        loadComponent: () =>
          import('./pages/product-detail/tabs/product-summary').then((m) => m.ProductSummary),
        title: 'Producto · Resumen',
      },
      {
        path: 'receta',
        loadComponent: () =>
          import('./pages/product-detail/tabs/product-recipe').then((m) => m.ProductRecipe),
        title: 'Producto · Receta y costo',
      },
      {
        path: 'existencias',
        loadComponent: () =>
          import('./pages/product-detail/tabs/product-stock').then((m) => m.ProductStock),
        title: 'Producto · Existencias',
      },
      {
        path: 'precios',
        loadComponent: () =>
          import('./pages/product-detail/tabs/product-pricing').then((m) => m.ProductPricing),
        title: 'Producto · Precios',
      },
      {
        path: 'historial',
        loadComponent: () =>
          import('./pages/product-detail/tabs/product-history').then((m) => m.ProductHistory),
        title: 'Producto · Historial',
      },
    ],
  },
];
