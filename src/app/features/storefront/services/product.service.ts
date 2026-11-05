import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = inject(ApiClient);

  /** Productos activos con su existencia (catálogo público de la tienda en línea). */
  activeUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.activos);
  }

  /**
   * Productos activos habilitados en el punto de venta (`canal=POS`, solo personal), con su existencia.
   * El catálogo público de arriba excluye los de la tienda deshabilitada.
   */
  activePosUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.activos, { canal: 'POS' });
  }

  byIdUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.productos.byId(id));
  }

  categoriesUrl(): string {
    return this.api.url(API_ENDPOINTS.categorias.root);
  }
}
