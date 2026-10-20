import { UserRole } from '../../core/models/user.model';
import { IconName } from '../ui/icon/icon';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly icon: IconName;
  readonly roles: readonly UserRole[];
  /** Marca el enlace activo solo con la ruta exacta (el Panel, que es prefijo de todo). */
  readonly exact?: boolean;
}

export interface NavGroup {
  readonly label: string;
  readonly items: readonly NavItem[];
}

const ADMIN_JEFE: readonly UserRole[] = ['ADMINISTRADOR', 'JEFE_PRODUCCION'];
const INVENTARIO: readonly UserRole[] = ['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'];
const REPORTES: readonly UserRole[] = ['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO', 'DESPACHADOR'];

// Los roles de aquí deben coincidir con los roleGuard de app.routes.ts.
export const BACKOFFICE_NAV_GROUPS: readonly NavGroup[] = [
  {
    label: 'Inicio',
    items: [
      { label: 'Panel', path: '/backoffice', icon: 'home', roles: ['ADMINISTRADOR'], exact: true },
    ],
  },
  {
    label: 'Ventas',
    items: [
      { label: 'Punto de venta', path: '/backoffice/pos', icon: 'pos', roles: ['ADMINISTRADOR', 'CAJERO'] },
      {
        label: 'Pedidos en línea',
        path: '/backoffice/orders',
        icon: 'bag',
        roles: ['ADMINISTRADOR', 'DESPACHADOR'],
      },
    ],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos', path: '/backoffice/products', icon: 'bread', roles: ADMIN_JEFE },
      { label: 'Categorías', path: '/backoffice/categories', icon: 'tag', roles: ADMIN_JEFE },
      { label: 'Materia prima', path: '/backoffice/raw-materials', icon: 'sack', roles: INVENTARIO },
      { label: 'Combos', path: '/backoffice/combos', icon: 'combo', roles: ['ADMINISTRADOR'] },
      { label: 'Compras', path: '/backoffice/purchases', icon: 'receipt', roles: INVENTARIO },
      { label: 'Proveedores', path: '/backoffice/suppliers', icon: 'truck', roles: INVENTARIO },
      { label: 'Movimientos', path: '/backoffice/movements', icon: 'movements', roles: INVENTARIO },
      { label: 'Traslados', path: '/backoffice/transfers', icon: 'transfer', roles: INVENTARIO },
    ],
  },
  {
    label: 'Producción',
    items: [
      { label: 'Órdenes', path: '/backoffice/production', icon: 'order', roles: ADMIN_JEFE },
      { label: 'Recetas', path: '/backoffice/recipes', icon: 'recipe', roles: ADMIN_JEFE },
    ],
  },
  {
    label: 'Precios',
    items: [
      { label: 'Promociones', path: '/backoffice/promotions', icon: 'tag', roles: ['ADMINISTRADOR'] },
      { label: 'Mayoreo', path: '/backoffice/wholesale', icon: 'scale', roles: ['ADMINISTRADOR'] },
    ],
  },
  {
    label: 'Reportes',
    // Cada reporte declara sus roles; el catálogo del servidor muestra solo los permitidos.
    items: [{ label: 'Reportes', path: '/backoffice/reports', icon: 'scale', roles: REPORTES }],
  },
  {
    label: 'Administración',
    items: [
      { label: 'Usuarios', path: '/backoffice/users', icon: 'users', roles: ['ADMINISTRADOR'] },
      { label: 'Empresa', path: '/backoffice/company', icon: 'info', roles: ['ADMINISTRADOR'] },
      { label: 'Sucursales', path: '/backoffice/branches', icon: 'store', roles: ['ADMINISTRADOR'] },
      { label: 'Bitácora', path: '/backoffice/audit', icon: 'clock', roles: ['ADMINISTRADOR'] },
    ],
  },
];

/** Lista plana, para el desplegable móvil y el menú del punto de venta. */
export const BACKOFFICE_NAV: readonly NavItem[] = BACKOFFICE_NAV_GROUPS.flatMap((g) => g.items);
