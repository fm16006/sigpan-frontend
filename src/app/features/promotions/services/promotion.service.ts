import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Promotion, PromotionDraft } from '../../../core/models/promotion.model';

/**
 * Promociones. El alcance (todos, categorías o productos) viaja dentro del mismo cuerpo de alta y edición:
 * el backend guarda productos y categorías junto con la promoción.
 */
@Injectable({ providedIn: 'root' })
export class PromotionService extends CrudClient<Promotion, PromotionDraft> {
  constructor() {
    super({ root: API_ENDPOINTS.promociones.root, byId: API_ENDPOINTS.promociones.byId });
  }

  /** Lista de promociones (no paginada). */
  listAll(): Observable<Promotion[]> {
    return this.api.get<Promotion[]>(API_ENDPOINTS.promociones.root);
  }
}
