import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient, QueryParams } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import {
  CatalogProduct,
  CatalogProductDraft,
  Category,
} from '../../../core/models/catalog.model';

@Injectable({ providedIn: 'root' })
export class ProductAdminService {
  private readonly api = inject(ApiClient);

  /** `scope`: `sucursalId` o `todas`; sin él, la existencia es la de la tienda en línea. */
  productsUrl(scope?: QueryParams): string {
    return this.api.url(API_ENDPOINTS.productos.root, scope);
  }

  categoriesUrl(): string {
    return this.api.url(API_ENDPOINTS.categorias.root);
  }

  create(draft: CatalogProductDraft): Observable<CatalogProduct> {
    return this.api.post<CatalogProduct>(API_ENDPOINTS.productos.root, draft);
  }

  update(id: Id, draft: CatalogProductDraft): Observable<CatalogProduct> {
    return this.api.put<CatalogProduct>(API_ENDPOINTS.productos.byId(id), draft);
  }

  remove(id: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.productos.byId(id));
  }

  uploadImage(id: Id, file: File): Observable<CatalogProduct> {
    const body = new FormData();
    body.append('archivo', file);
    return this.api.post<CatalogProduct>(API_ENDPOINTS.productos.imagen(id), body);
  }

  removeImage(id: Id): Observable<CatalogProduct> {
    return this.api.delete<CatalogProduct>(API_ENDPOINTS.productos.imagen(id));
  }

  createCategory(nombre: string): Observable<Category> {
    return this.api.post<Category>(API_ENDPOINTS.categorias.root, { nombre });
  }
}
