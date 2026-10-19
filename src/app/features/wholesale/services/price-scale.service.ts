import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Id } from '../../../core/models/api.model';
import { PriceScale, PriceScaleDraft } from '../../../core/models/price-scale.model';

/** Tramos de precio por cantidad (mayoreo). */
@Injectable({ providedIn: 'root' })
export class PriceScaleService extends CrudClient<PriceScale, PriceScaleDraft> {
  constructor() {
    super({ root: API_ENDPOINTS.escalasPrecio.root, byId: API_ENDPOINTS.escalasPrecio.byId });
  }

  byProduct(productoId: Id): Observable<PriceScale[]> {
    return this.api.get<PriceScale[]>(API_ENDPOINTS.escalasPrecio.byProducto(productoId));
  }
}
