import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiClient } from '../http/api-client';
import { Quote, QuoteRequest } from '../models/quote.model';

/** Cotización de canastas con el motor de promociones del backend. No registra ventas. */
@Injectable({ providedIn: 'root' })
export class QuoteService {
  private readonly api = inject(ApiClient);

  /** URL absoluta para httpResource (que hace el POST con el cuerpo de la canasta). */
  readonly url = this.api.url(API_ENDPOINTS.orders.quote);

  quote(request: QuoteRequest): Observable<Quote> {
    return this.api.post<Quote>(API_ENDPOINTS.orders.quote, request);
  }
}
