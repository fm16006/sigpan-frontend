import { Component, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import {
  DELIVERY_MODE_LABELS,
  ORDER_STATUS_BADGE,
  ORDER_STATUS_LABELS,
  Sale,
} from '../../../../core/models/order.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { OrderService } from '../../services/order.service';
import { OrderTimeline } from '../../ui/order-timeline/order-timeline';

/** HU-42: consulta pública con el número de pedido y el correo de la cuenta. */
@Component({
  selector: 'app-tracking',
  imports: [FormsModule, PageHeader, OrderTimeline, MoneyPipe, DatePipe],
  templateUrl: './tracking.html',
})
export class Tracking {
  private readonly orders = inject(OrderService);

  protected readonly statusLabels = ORDER_STATUS_LABELS;
  protected readonly statusBadge = ORDER_STATUS_BADGE;
  protected readonly modeLabels = DELIVERY_MODE_LABELS;

  protected numero = inject(ActivatedRoute).snapshot.queryParamMap.get('numero') ?? '';
  protected correo = '';
  protected readonly order = signal<Sale | null>(null);
  protected readonly searching = signal(false);
  protected readonly notFound = signal(false);

  protected search(): void {
    const numero = Number(this.numero);
    if (!numero || !this.correo.trim()) {
      return;
    }
    this.searching.set(true);
    this.notFound.set(false);
    this.orders.track(numero, this.correo.trim()).subscribe({
      next: (order) => {
        this.order.set(order);
        this.searching.set(false);
      },
      error: () => {
        this.order.set(null);
        this.notFound.set(true);
        this.searching.set(false);
      },
    });
  }
}
