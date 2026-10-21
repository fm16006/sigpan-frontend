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
    /** Habilita o deshabilita el producto en el punto de venta y/o la tienda en línea. */
    canales: (id: Id) => `/productos/${id}/canales`,
  },
  categorias: {
    root: '/categorias',
    byId: (id: Id) => `/categorias/${id}`,
    /** Reactiva una categoría desactivada. */
    activar: (id: Id) => `/categorias/${id}/activar`,
  },
  usuarios: {
    root: '/usuarios',
    byId: (id: Id) => `/usuarios/${id}`,
  },
  roles: {
    root: '/roles',
  },
  sucursales: {
    /** La sucursal (única) con sus cajas activas; la usa el punto de venta para elegir caja. */
    mine: '/sucursales/mi-sucursal',
  },
  materiasPrimas: {
    root: '/materias-primas',
    stockBajo: '/materias-primas/stock-bajo',
    byId: (id: Id) => `/materias-primas/${id}`,
  },
  inventarios: {
    materiasPrimas: '/inventarios/materia-prima',
    productos: '/inventarios/producto',
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
  reportes: {
    /** Catálogo de reportes del rol, con el contrato de cada uno (parámetros y columnas). */
    root: '/reportes',
    byCodigo: (codigo: string) => `/reportes/${codigo}`,
    pdf: (codigo: string) => `/reportes/${codigo}/pdf`,
    xlsx: (codigo: string) => `/reportes/${codigo}/xlsx`,
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
    /** Combos vendibles en el punto de venta, con su existencia (cajero y administración). */
    pos: '/combos/pos',
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
