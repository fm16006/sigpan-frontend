import { UserRole } from '../../core/models/user.model';

export interface NavItem {
  readonly label: string;
  readonly path: string;
  readonly roles: readonly UserRole[];
}

// Los roles de aquí deben coincidir con los roleGuard de app.routes.ts.
export const BACKOFFICE_NAV: readonly NavItem[] = [
  { label: 'Panel', path: '/backoffice', roles: ['ADMIN', 'PRODUCTION'] },
  { label: 'Punto de venta', path: '/backoffice/pos', roles: ['ADMIN', 'CASHIER'] },
  { label: 'Inventario', path: '/backoffice/inventory', roles: ['ADMIN', 'PRODUCTION'] },
  { label: 'Recetas', path: '/backoffice/recipes', roles: ['ADMIN', 'PRODUCTION'] },
  { label: 'Promociones', path: '/backoffice/promotions', roles: ['ADMIN'] },
];
