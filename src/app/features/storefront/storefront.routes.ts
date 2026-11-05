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
    path: 'seguimiento',
    loadComponent: () => import('./pages/tracking/tracking').then((m) => m.Tracking),
    title: 'Seguimiento de pedido',
  },
  {
    path: 'cuenta',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/account/account').then((m) => m.Account),
    title: 'Mi cuenta',
  },
  {
    path: 'orders',
    canActivate: [authGuard, roleGuard(['CLIENTE', 'ADMINISTRADOR'])],
    loadComponent: () => import('./pages/orders/orders').then((m) => m.Orders),
    title: 'Mis pedidos',
  },
];
