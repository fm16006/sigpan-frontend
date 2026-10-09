import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * Modo de renderizado por zona. Lo privado va en Client: si se prerenderizara,
 * el build dejaría su HTML entre los assets públicos.
 */
export const serverRoutes: ServerRoute[] = [
  // Estáticas: se prerenderizan para que carguen rápido y sean indexables.
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'sin-permisos', renderMode: RenderMode.Prerender },

  // En cada petición: prerenderizarlo congelaría precios y disponibilidad.
  { path: 'storefront', renderMode: RenderMode.Server },

  // Formularios de sesión: sin cachear.
  { path: 'auth/**', renderMode: RenderMode.Server },

  // Zonas privadas: solo en el cliente.
  { path: 'storefront/cart', renderMode: RenderMode.Client },
  { path: 'storefront/orders', renderMode: RenderMode.Client },
  { path: 'backoffice/**', renderMode: RenderMode.Client },

  { path: '**', renderMode: RenderMode.Server },
];
