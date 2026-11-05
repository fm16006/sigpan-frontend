import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import {
  DELIVERY_MODE_LABELS,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  Sale,
} from '../../../../core/models/order.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderService } from '../../services/order.service';
import { OrderTimeline } from '../../ui/order-timeline/order-timeline';
import { valueOr } from '../../../../core/http/resource-value';

@Component({
  selector: 'app-orders',
  imports: [RouterLink, PageHeader, ResourceState, OrderTimeline, MoneyPipe, DatePipe],
  templateUrl: './orders.html',
})
export class Orders {
  private readonly orders = inject(OrderService);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly statusBadge = ORDER_STATUS_BADGE;
  protected readonly modeLabels = DELIVERY_MODE_LABELS;

  protected readonly history = httpResource<Sale[]>(() => this.orders.myOrdersUrl(), {
    defaultValue: [],
  });
  protected readonly historyItems = computed(() => valueOr(this.history, []));
}
