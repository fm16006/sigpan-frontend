import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import {
  Production,
  ProductionDraft,
  ProductionStatus,
} from '../../../core/models/production.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly api = inject(ApiClient);

  listUrl(): string {
    return this.api.url(API_ENDPOINTS.producciones.root);
  }

  productsUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.root);
  }

  formulasUrl(): string {
    return this.api.url(API_ENDPOINTS.formulas.root);
  }

  create(draft: ProductionDraft): Observable<Production> {
    return this.api.post<Production>(API_ENDPOINTS.producciones.root, draft);
  }

  changeStatus(id: Id, estado: ProductionStatus): Observable<Production> {
    return this.api.patch<Production>(API_ENDPOINTS.producciones.status(id), {}, { estado });
  }
}
