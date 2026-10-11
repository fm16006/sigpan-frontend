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
    activos: '/productos/activos',
    byId: (id: Id) => `/productos/${id}`,
    imagen: (id: Id) => `/productos/${id}/imagen`,
  },
  categorias: {
    root: '/categorias',
  },
  usuarios: {
    root: '/usuarios',
    byId: (id: Id) => `/usuarios/${id}`,
  },
  roles: {
    root: '/roles',
  },
  materiasPrimas: {
    root: '/materias-primas',
  },
  formulas: {
    root: '/formulas',
  },
  formulaDetalles: {
    byFormula: (id: Id) => `/formula-detalles/formula/${id}`,
  },
  promociones: {
    root: '/promociones',
  },
  orders: {
    place: '/ventas/pedido',
    counter: '/ventas/mostrador',
    mine: '/ventas/mis-pedidos',
    queue: '/ventas/pedidos',
    cashCut: '/ventas/corte',
    status: (id: Id) => `/ventas/${id}/estado`,
  },
} as const;

// Rutas sin Authorization. Se comparan contra el path, no la URL completa.
export const PUBLIC_API_PATHS: readonly string[] = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.resendVerification,
  API_ENDPOINTS.auth.refresh,
];
