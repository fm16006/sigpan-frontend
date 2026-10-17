import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ORDER_STATUS_BADGE, ORDER_STATUS_LABELS, Sale } from '../../../../core/models/order.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, PageHeader, ResourceState, MoneyPipe, DatePipe],
  templateUrl: './orders.html',
})
export class Orders {
  private readonly orders = inject(OrderService);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly statusBadge = ORDER_STATUS_BADGE;

  protected readonly history = httpResource<Sale[]>(() => this.orders.myOrdersUrl(), {
    defaultValue: [],
  });
}
