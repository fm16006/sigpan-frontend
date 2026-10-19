import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = inject(ApiClient);

  /**
   * Productos activos con su existencia. Sin sucursal es la de la tienda en línea (catálogo público);
   * el punto de venta pide la de la sucursal de su caja.
   */
  activeUrl(sucursalId?: Id | null): string {
    return this.api.url(API_ENDPOINTS.productos.activos, { sucursalId });
  }

  /**
   * Productos activos habilitados en el punto de venta (`canal=POS`, solo personal), con la existencia
   * de la sucursal de la caja. El catálogo público de arriba excluye los de la tienda deshabilitada.
   */
  activePosUrl(sucursalId?: Id | null): string {
    return this.api.url(API_ENDPOINTS.productos.activos, { sucursalId, canal: 'POS' });
  }

  byIdUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.productos.byId(id));
  }

  categoriesUrl(): string {
    return this.api.url(API_ENDPOINTS.categorias.root);
  }
}
