import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import { OrderStatus, Sale, SaleRequest } from '../../../core/models/order.model';
import { ApiUser } from '../../../core/models/user.model';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private readonly api = inject(ApiClient);

  placeOrder(request: SaleRequest): Observable<Sale> {
    return this.api.post<Sale>(API_ENDPOINTS.orders.place, request);
  }

  counterSale(request: SaleRequest): Observable<Sale> {
    return this.api.post<Sale>(API_ENDPOINTS.orders.counter, request);
  }

  counterEncargo(clienteId: Id, request: SaleRequest): Observable<Sale> {
    return this.api.post<Sale>(API_ENDPOINTS.orders.encargo(clienteId), request);
  }

  findClient(correo: string): Observable<ApiUser> {
    return this.api.get<ApiUser>(API_ENDPOINTS.orders.findClient, { correo });
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

  advance(id: Id): Observable<Sale> {
    return this.api.patch<Sale>(API_ENDPOINTS.orders.advance(id), {});
  }

  track(numero: Id, correo: string): Observable<Sale> {
    return this.api.get<Sale>(API_ENDPOINTS.orders.tracking, { numero, correo });
  }

  bestSellersUrl(): string {
    return this.api.url(API_ENDPOINTS.orders.bestSellers);
  }

  changeStatus(id: Id, estado: OrderStatus): Observable<Sale> {
    return this.api.patch<Sale>(
      `${API_ENDPOINTS.orders.status(id)}?estado=${encodeURIComponent(estado)}`,
      {},
    );
  }
}
