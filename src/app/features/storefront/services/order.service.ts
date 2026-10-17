import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import { OrderStatus, Sale, SaleRequest } from '../../../core/models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiClient);

  placeOrder(request: SaleRequest): Observable<Sale> {
    return this.api.post<Sale>(API_ENDPOINTS.orders.place, request);
  }

  counterSale(request: SaleRequest): Observable<Sale> {
    return this.api.post<Sale>(API_ENDPOINTS.orders.counter, request);
  }

  myOrdersUrl(): string {
    return this.api.url(API_ENDPOINTS.orders.mine);
  }

  queueUrl(): string {
    return this.api.url(API_ENDPOINTS.orders.queue);
  }

  cashCutUrl(fecha: string): string {
    return this.api.url(API_ENDPOINTS.orders.cashCut, { fecha });
  }

  changeStatus(id: Id, estado: OrderStatus): Observable<Sale> {
    return this.api.patch<Sale>(
      `${API_ENDPOINTS.orders.status(id)}?estado=${encodeURIComponent(estado)}`,
      {},
    );
  }
}
