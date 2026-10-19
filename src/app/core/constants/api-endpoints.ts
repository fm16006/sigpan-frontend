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
    byId: (id: Id) => `/formulas/${id}`,
    /** Costo unitario calculado por el backend (solo administración y jefe de producción). */
    costoUnitario: (id: Id) => `/formulas/${id}/costo-unitario`,
    /** Explosion de materiales de la formula de un producto (administracion y jefe de produccion). */
    explosion: (productoId: Id) => `/formulas/producto/${productoId}/explosion`,
  },
  formulaDetalles: {
    root: '/formula-detalles',
    byId: (id: Id) => `/formula-detalles/${id}`,
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
    byId: (id: Id) => `/promociones/${id}`,
  },
  promocionesProductos: {
    root: '/promociones-productos',
    byId: (id: Id) => `/promociones-productos/${id}`,
    byPromocion: (id: Id) => `/promociones-productos/promocion/${id}`,
  },
  combos: {
    root: '/combos',
    byId: (id: Id) => `/combos/${id}`,
  },
  combosDetalles: {
    root: '/combos-detalles',
    byId: (id: Id) => `/combos-detalles/${id}`,
    byCombo: (id: Id) => `/combos-detalles/combo/${id}`,
  },
  escalasPrecio: {
    root: '/escalas-precio',
    byId: (id: Id) => `/escalas-precio/${id}`,
    byProducto: (id: Id) => `/escalas-precio/producto/${id}`,
  },
  orders: {
    place: '/ventas/pedido',
    counter: '/ventas/mostrador',
    mine: '/ventas/mis-pedidos',
    queue: '/ventas/pedidos',
    cashCut: '/ventas/corte',
    status: (id: Id) => `/ventas/${id}/estado`,
    /** Cotiza una canasta con el motor de promociones. No guarda nada. */
    quote: '/ventas/cotizar',
  },
} as const;

// Rutas sin Authorization. Se comparan contra el path, no la URL completa.
export const PUBLIC_API_PATHS: readonly string[] = [
  API_ENDPOINTS.auth.login,
  API_ENDPOINTS.auth.google,
  API_ENDPOINTS.auth.resendVerification,
  API_ENDPOINTS.auth.refresh,
];
