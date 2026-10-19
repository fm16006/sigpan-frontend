import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Id } from '../../../core/models/api.model';
import {
  Promotion,
  PromotionDraft,
  PromotionProductLink,
} from '../../../core/models/promotion.model';

@Injectable({ providedIn: 'root' })
export class PromotionService extends CrudClient<Promotion, PromotionDraft> {
  constructor() {
    super({ root: API_ENDPOINTS.promociones.root, byId: API_ENDPOINTS.promociones.byId });
  }

  /** Lista de promociones (no paginada). */
  listAll(): Observable<Promotion[]> {
    return this.api.get<Promotion[]>(API_ENDPOINTS.promociones.root);
  }

  /** Todos los vínculos promoción-producto (para contar productos por promoción). */
  allLinks(): Observable<PromotionProductLink[]> {
    return this.api.get<PromotionProductLink[]>(API_ENDPOINTS.promocionesProductos.root);
  }

  productLinks(promocionId: Id): Observable<PromotionProductLink[]> {
    return this.api.get<PromotionProductLink[]>(
      API_ENDPOINTS.promocionesProductos.byPromocion(promocionId),
    );
  }

  addProduct(promocionId: Id, productoId: Id): Observable<PromotionProductLink> {
    return this.api.post<PromotionProductLink>(API_ENDPOINTS.promocionesProductos.root, {
      promocionId,
      productoId,
    });
  }

  removeLink(linkId: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.promocionesProductos.byId(linkId));
  }
}
