import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import {
  NEXT_STATUS,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  OrderStatus,
  Sale,
} from '../../../../core/models/order.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderService } from '../../../storefront/services/order.service';

const ACTIVE: readonly string[] = ['PENDIENTE', 'EN_PREPARACION', 'LISTO'];
const REFRESH_MS = 30_000;

@Component({
  selector: 'app-order-queue',
  imports: [PageHeader, ResourceState, MoneyPipe, DatePipe],
  templateUrl: './order-queue.html',
})
export class OrderQueue {
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly statusBadge = ORDER_STATUS_BADGE;
  protected readonly showClosed = signal(false);
  protected readonly busyId = signal<Id | null>(null);

  protected readonly queue = httpResource<Sale[]>(() => this.orders.queueUrl(), {
    defaultValue: [],
  });

  protected readonly items = computed(() =>
    this.queue
      .value()
      .filter((order) => this.showClosed() || ACTIVE.includes(order.estado))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
  );

  protected readonly pendingCount = computed(
    () => this.queue.value().filter((order) => ACTIVE.includes(order.estado)).length,
  );

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.queue.reload(), REFRESH_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected nextStatus(order: Sale): OrderStatus | undefined {
    return NEXT_STATUS[order.estado as OrderStatus];
  }

  protected isActive(order: Sale): boolean {
    return ACTIVE.includes(order.estado);
  }

  protected advance(order: Sale): void {
    const next = this.nextStatus(order);
    if (next) {
      this.change(order, next);
    }
  }

  protected cancel(order: Sale): void {
    this.change(order, 'CANCELADO');
  }

  private change(order: Sale, estado: OrderStatus): void {
    this.busyId.set(order.id);
    this.orders.changeStatus(order.id, estado).subscribe({
      next: () => {
        this.busyId.set(null);
        this.notifications.success(`Pedido #${order.id}: ${ORDER_STATUS_LABELS[estado]}.`);
        this.queue.reload();
      },
      error: () => this.busyId.set(null),
    });
  }
}
