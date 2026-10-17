import { Id } from '../models/api.model';

// Rutas del backend.
export const API_ENDPOINTS = {
  auth: {
    login: '/usuarios/login',
    google: '/usuarios/login/google',
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
    stockBajo: '/materias-primas/stock-bajo',
  },
  inventarios: {
    materiasPrimas: '/inventarios/materia-prima',
    productos: '/inventarios/producto',
  },
  movimientos: {
    materiasPrimas: '/movimientos-inventario/materia-prima',
    byMateriaPrima: (id: Id) => `/movimientos-inventario/materia-prima/${id}`,
    productos: '/movimientos-inventario/producto',
    byProducto: (id: Id) => `/movimientos-inventario/producto/${id}`,
  },
  formulas: {
    root: '/formulas',
  },
  formulaDetalles: {
    byFormula: (id: Id) => `/formula-detalles/formula/${id}`,
  },
  producciones: {
    root: '/producciones',
    status: (id: Id) => `/producciones/${id}/estado`,
  },
  logs: {
    root: '/logs',
  },
  eventos: {
    root: '/eventos',
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
  API_ENDPOINTS.auth.google,
  API_ENDPOINTS.auth.resendVerification,
  API_ENDPOINTS.auth.refresh,
];
