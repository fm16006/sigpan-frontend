import { UserRole } from '../../core/models/user.model';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly roles: readonly UserRole[];
}

// Los roles de aquí deben coincidir con los roleGuard de app.routes.ts.
export const BACKOFFICE_NAV: readonly NavItem[] = [
  { label: 'Panel', path: '/backoffice', roles: ['ADMINISTRADOR'] },
  { label: 'Punto de venta', path: '/backoffice/pos', roles: ['ADMINISTRADOR', 'CAJERO'] },
  {
    label: 'Pedidos en línea',
    path: '/backoffice/orders',
    roles: ['ADMINISTRADOR', 'CAJERO', 'DESPACHADOR'],
  },
  { label: 'Productos', path: '/backoffice/products', roles: ['ADMINISTRADOR', 'JEFE_PRODUCCION'] },
  {
    label: 'Inventario',
    path: '/backoffice/inventory',
    roles: ['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'],
  },
  { label: 'Recetas', path: '/backoffice/recipes', roles: ['ADMINISTRADOR', 'JEFE_PRODUCCION'] },
  { label: 'Promociones', path: '/backoffice/promotions', roles: ['ADMINISTRADOR'] },
  { label: 'Usuarios', path: '/backoffice/users', roles: ['ADMINISTRADOR'] },
];
