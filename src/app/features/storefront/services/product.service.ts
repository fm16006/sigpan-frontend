import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';

@Injectable({ providedIn: 'root' })
export class ProductService {
  private readonly api = inject(ApiClient);

  activeUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.activos);
  }

  byIdUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.productos.byId(id));
  }

  categoriesUrl(): string {
    return this.api.url(API_ENDPOINTS.categorias.root);
  }
}
