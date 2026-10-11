import { Routes } from '@angular/router';
import { authGuard } from '../../core/guards/auth-guard';
import { roleGuard } from '../../core/guards/role-guard';

export const STOREFRONT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () => import('./pages/catalog/catalog').then((m) => m.Catalog),
    title: 'Catálogo',
  },
  {
    path: 'cart',
    loadComponent: () => import('./pages/cart/cart').then((m) => m.Cart),
    title: 'Carrito',
  },
  {
    path: 'orders',
    canActivate: [authGuard, roleGuard(['CLIENTE', 'ADMINISTRADOR'])],
    loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders),
    title: 'Mis pedidos',
  },
];