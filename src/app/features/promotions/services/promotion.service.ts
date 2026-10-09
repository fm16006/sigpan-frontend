import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Promotion, PromotionDraft } from '../../../core/models/promotion.model';

@Injectable({ providedIn: 'root' })
export class PromotionService extends CrudClient<Promotion, PromotionDraft> {
  constructor() {
    super(API_ENDPOINTS.promotions);
  }
}
