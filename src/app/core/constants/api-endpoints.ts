import { Id } from '../models/api.model';

// Rutas del backend.
export const API_ENDPOINTS = {
  auth: {
    login: '/usuarios/login',
    register: '/usuarios',
    resendVerification: '/usuarios/reenviar-verificacion',
    /** Canjea la cookie de refresh por un access token nuevo. */
    refresh: '/usuarios/renovar-token',
    logout: '/usuarios/logout',
    me: '/usuarios/perfil',
  },
  productos: {
    root: '/productos',
    byId: (id: Id) => `/productos/${id}`,
    imagen: (id: Id) => `/productos/${id}/imagen`,
  },
  categorias: {
    root: '/categorias',
  },
  products: {
    root: '/products',
    byId: (id: Id) => `/products/${id}`,
    /** Visible sin autenticación. */
    public: '/products/public',
  },
  orders: {
    root: '/orders',
    byId: (id: Id) => `/orders/${id}`,
    mine: '/orders/me',
    status: (id: Id) => `/orders/${id}/status`,
  },
  inventory: {
    root: '/inventory',
    byId: (id: Id) => `/inventory/${id}`,
    lowStock: '/inventory/low-stock',
  },
  promotions: {
    root: '/promotions',
    byId: (id: Id) => `/promotions/${id}`,
    active: '/promotions/active',
  },
  recipes: {
    root: '/recipes',
    byId: (id: Id) => `/recipes/${id}`,
  },
  reports: {
    summary: '/reports/summary',
  },
} as const;

// Rutas sin Authorization. Se comparan contra el path, no la URL completa.
export const PUBLIC_API_PATHS: readonly string[] = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.resendVerification,
  API_ENDPOINTS.auth.refresh,
  API_ENDPOINTS.products.public,
];
