import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { PageQuery } from '../../../core/models/api.model';
import { Product, ProductCategory, ProductDraft } from '../../../core/models/product.model';

export interface CatalogQuery extends PageQuery {
  readonly category?: ProductCategory;
}

@Injectable({ providedIn: 'root' })
export class ProductService extends CrudClient<Product, ProductDraft> {
  constructor() {
    super(API_ENDPOINTS.products);
  }

  /** Catálogo público, sin autenticación. */
  catalogUrl(query: CatalogQuery): string {
    return this.api.url(API_ENDPOINTS.products.public, { ...query });
  }
}
