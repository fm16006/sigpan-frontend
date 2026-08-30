export const API_ENDPOINTS = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },
  products: '/products',
  orders: '/orders',
  inventory: '/inventory',
  promotions: '/promotions',
} as const;