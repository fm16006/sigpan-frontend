import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import {
  NEXT_STATUS,
  ORDER_STATUS_LABELS,
  OrderStatus,
  Sale,
} from '../../../../core/models/order.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ChipTone, StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderService } from '../../../storefront/services/order.service';
import { valueOr } from '../../../../core/http/resource-value';

const ACTIVE: readonly string[] = ['PENDIENTE', 'EN_PREPARACION', 'LISTO'];
const REFRESH_MS = 30_000;

const STATUS_TONES: Readonly<Record<string, ChipTone>> = {
  PENDIENTE: 'neutral',
  EN_PREPARACION: 'warn',
  LISTO: 'info',
  ENTREGADO: 'ok',
  CANCELADO: 'bad',
  COMPLETADA: 'ok',
};

@Component({
  selector: 'app-order-queue',
  imports: [PageHeader, ResourceState, ConfirmDialog, StatusChip, MoneyPipe, DatePipe],
  templateUrl: './order-queue.html',
})
export class OrderQueue {
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);

  protected readonly crumbs = [{ label: 'Ventas' }, { label: 'Pedidos en línea' }];
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly cancelling = signal<Sale | null>(null);
  protected readonly showClosed = signal(false);
  protected readonly busyId = signal<Id | null>(null);

  protected readonly queue = httpResource<Sale[]>(() => this.orders.queueUrl(), {
    defaultValue: [],
  });

  protected readonly queueItems = computed(() => valueOr(this.queue, []));

  protected readonly items = computed(() =>
    this.queueItems()
      .filter((order) => this.showClosed() || ACTIVE.includes(order.estado))
      .sort((a, b) => a.fecha.localeCompare(b.fecha)),
  );

  protected readonly cancelMessage = computed(() => {
    const order = this.cancelling();
    return order
      ? `Vas a cancelar el pedido #${order.id} de ${order.usuario ?? "un cliente"}. El pedido queda como cancelado y no se puede reactivar.`
      : '';
  });

  protected readonly pendingCount = computed(
    () => this.queueItems().filter((order) => ACTIVE.includes(order.estado)).length,
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

  protected statusTone(order: Sale): ChipTone {
    return STATUS_TONES[order.estado] ?? 'neutral';
  }

  protected askCancel(order: Sale): void {
    this.cancelling.set(order);
  }

  protected dismissCancel(): void {
    this.cancelling.set(null);
  }

  protected confirmCancel(): void {
    const order = this.cancelling();
    this.cancelling.set(null);
    if (order) {
      this.change(order, 'CANCELADO');
    }
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
