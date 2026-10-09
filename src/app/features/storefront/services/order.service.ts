import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Id } from '../../../core/models/api.model';
import { Order, OrderRequest, OrderStatus } from '../../../core/models/order.model';

@Injectable({ providedIn: 'root' })
export class OrderService extends CrudClient<Order, OrderRequest> {
  constructor() {
    super(API_ENDPOINTS.orders);
  }

  /** Pedidos del usuario autenticado; el backend lo resuelve por el token. */
  myOrdersUrl(): string {
    return this.api.url(API_ENDPOINTS.orders.mine);
  }

  changeStatus(id: Id, status: OrderStatus): Observable<Order> {
    return this.api.patch<Order>(API_ENDPOINTS.orders.status(id), { status });
  }
}
