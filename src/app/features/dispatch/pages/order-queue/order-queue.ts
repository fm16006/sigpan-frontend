import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import {
  DELIVERY_MODE_LABELS,
  OPEN_STATUSES,
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  Sale,
} from '../../../../core/models/order.model';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { ProductionSuggestion } from '../../../../core/models/stock-control.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ChipTone, StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderService } from '../../../storefront/services/order.service';
import { valueOr } from '../../../../core/http/resource-value';

const ACTIVE = OPEN_STATUSES;
const REFRESH_MS = 30_000;

const STATUS_TONES: Readonly<Record<string, ChipTone>> = {
  PENDIENTE: 'neutral',
  CONFIRMADO: 'neutral',
  EN_PREPARACION: 'warn',
  LISTO: 'info',
  EN_RUTA: 'info',
  EN_ESPERA_RETIRO: 'info',
  ENTREGADO: 'ok',
  CANCELADO: 'bad',
  COMPLETADA: 'ok',
};

@Component({
  selector: 'app-order-queue',
  imports: [RouterLink, PageHeader, ResourceState, ConfirmDialog, StatusChip, MoneyPipe, DatePipe],
  templateUrl: './order-queue.html',
})
export class OrderQueue {
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);
  private readonly api = inject(ApiClient);
  private readonly auth = inject(Auth);

  protected readonly crumbs = [{ label: 'Ventas' }, { label: 'Pedidos en línea' }];
  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly modeLabels = DELIVERY_MODE_LABELS;
  protected readonly cancelling = signal<Sale | null>(null);
  protected readonly showClosed = signal(false);
  protected readonly busyId = signal<Id | null>(null);

  // DEF-19: la cola trae solo lo que está en curso; los cerrados se piden al activar el interruptor.
  protected readonly queue = httpResource<Sale[]>(() => this.orders.queueUrl(!this.showClosed()), {
    defaultValue: [],
  });

  protected readonly queueItems = computed(() => valueOr(this.queue, []));

  protected readonly items = computed(() =>
    this.queueItems()
      .filter((order) => this.showClosed() || ACTIVE.includes(order.estado))
      .sort((a, b) => (a.fechaProgramada ?? a.fecha).localeCompare(b.fechaProgramada ?? b.fecha)),
  );

  /** HU-44: agrupados por estado en el orden del flujo, cada grupo por hora prometida. */
  protected readonly groups = computed(() => {
    const byState = new Map<string, Sale[]>();
    for (const order of this.items()) {
      byState.set(order.estado, [...(byState.get(order.estado) ?? []), order]);
    }
    return ORDER_STATUSES.filter((estado) => byState.has(estado)).map((estado) => ({ estado, orders: byState.get(estado)! }));
  });

  protected readonly canSeeSuggestion = this.auth.hasAnyRole(['ADMINISTRADOR', 'DESPACHADOR', 'JEFE_PRODUCCION']);
  protected readonly canPlanProduction = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);
  private readonly suggestion = httpResource<ProductionSuggestion[]>(
    () => (this.canSeeSuggestion ? this.api.url(API_ENDPOINTS.orders.productionSuggestion) : undefined),
    { defaultValue: [] },
  );
  protected readonly suggestionItems = computed(() => valueOr(this.suggestion, []));
  protected readonly toProduce = computed(() => this.suggestionItems().filter((s) => s.sugerido > 0));

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
      const timer = setInterval(() => {
        this.queue.reload();
        this.suggestion.reload();
      }, REFRESH_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected isActive(order: Sale): boolean {
    return ACTIVE.includes(order.estado);
  }

  protected advance(order: Sale): void {
    this.run(order, this.orders.advance(order.id));
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

  private change(order: Sale, estado: 'CANCELADO'): void {
    this.run(order, this.orders.changeStatus(order.id, estado));
  }

  private run(order: Sale, request: Observable<Sale>): void {
    this.busyId.set(order.id);
    request.subscribe({
      next: (updated) => {
        this.busyId.set(null);
        this.notifications.success(`Pedido #${order.id}: ${ORDER_STATUS_LABELS[updated.estado] ?? updated.estado}.`);
        this.queue.reload();
      },
      error: () => this.busyId.set(null),
    });
  }
}
