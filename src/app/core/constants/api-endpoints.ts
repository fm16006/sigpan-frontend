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
  sucursales: {
    root: '/sucursales',
    byId: (id: Id) => `/sucursales/${id}`,
    /** Sucursal del usuario de la sesión, con sus cajas activas. */
    mine: '/sucursales/mi-sucursal',
    usuarios: (id: Id) => `/sucursales/${id}/usuarios`,
    cajas: (id: Id) => `/sucursales/${id}/cajas`,
    cajaById: (id: Id, cajaId: Id) => `/sucursales/${id}/cajas/${cajaId}`,
  },
  materiasPrimas: {
    root: '/materias-primas',
    stockBajo: '/materias-primas/stock-bajo',
    byId: (id: Id) => `/materias-primas/${id}`,
  },
  inventarios: {
    materiasPrimas: '/inventarios/materia-prima',
    productos: '/inventarios/producto',
    /** Sucursales (id, nombre, código, estado) para elegirlas en inventario y traslados. */
    sucursales: '/inventarios/sucursales',
    /** Inventario de un producto, por id de producto. */
    byProducto: (productoId: Id) => `/inventarios/producto/${productoId}`,
    /** Inventario de una materia prima, por id de materia prima. */
    byMateriaPrima: (materiaPrimaId: Id) => `/inventarios/${materiaPrimaId}/materia-prima`,
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
    byProducto: (productoId: Id) => `/formulas/producto/${productoId}`,
    /** Costo unitario calculado por el backend (solo administración y jefe de producción). */
    costoUnitario: (id: Id) => `/formulas/${id}/costo-unitario`,
    /** Explosion de materiales de la formula de un producto (administracion y jefe de produccion). */
    explosion: (productoId: Id) => `/formulas/producto/${productoId}/explosion`,
  },
  formulaDetalles: {
    root: '/formula-detalles',
    byId: (id: Id) => `/formula-detalles/${id}`,
    byFormula: (id: Id) => `/formula-detalles/formula/${id}`,
    byMateriaPrima: (id: Id) => `/formula-detalles/materia-prima/${id}`,
  },
  producciones: {
    root: '/producciones',
    byId: (id: Id) => `/producciones/${id}`,
    status: (id: Id) => `/producciones/${id}/estado`,
  },
  produccionDetalle: {
    byProduccion: (id: Id) => `/produccion-detalle/produccion/${id}`,
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
    byProducto: (id: Id) => `/promociones-productos/producto/${id}`,
  },
  combos: {
    root: '/combos',
    byId: (id: Id) => `/combos/${id}`,
  },
  combosDetalles: {
    root: '/combos-detalles',
    byId: (id: Id) => `/combos-detalles/${id}`,
    byCombo: (id: Id) => `/combos-detalles/combo/${id}`,
    byProducto: (id: Id) => `/combos-detalles/producto/${id}`,
  },
  escalasPrecio: {
    root: '/escalas-precio',
    byId: (id: Id) => `/escalas-precio/${id}`,
    byProducto: (id: Id) => `/escalas-precio/producto/${id}`,
  },
  empresa: {
    /** GET público; PUT solo administración. */
    root: '/empresa',
    logo: '/empresa/logo',
  },
  proveedores: {
    root: '/proveedores',
    byId: (id: Id) => `/proveedores/${id}`,
    activo: (id: Id) => `/proveedores/${id}/activo`,
  },
  traslados: {
    root: '/traslados',
    byId: (id: Id) => `/traslados/${id}`,
  },
  compras: {
    root: '/compras',
    byId: (id: Id) => `/compras/${id}`,
    /** Últimas compras de un insumo (?materiaPrimaId) o de un producto de reventa (?productoId). */
    ultimas: '/compras/ultimas',
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
