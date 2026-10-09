import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { EMPTY_PAGE, Id, Page } from '../../../../core/models/api.model';
import { Product } from '../../../../core/models/product.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderService } from '../../../storefront/services/order.service';
import { ProductService } from '../../../storefront/services/product.service';

interface TicketLine {
  readonly product: Product;
  readonly quantity: number;
}

@Component({
  selector: 'app-pos-screen',
  imports: [PageHeader, ResourceState, MoneyPipe],
  templateUrl: './pos-screen.html',
})
export class PosScreen {
  private readonly products = inject(ProductService);
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);

  /** Independiente del carrito del cliente: son dos contextos de venta distintos. */
  private readonly ticket = signal<readonly TicketLine[]>([]);

  protected readonly lines = this.ticket.asReadonly();
  protected readonly total = computed(() =>
    this.ticket().reduce((sum, line) => sum + line.product.price * line.quantity, 0),
  );
  protected readonly submitting = signal(false);

  protected readonly catalog = httpResource<Page<Product>>(
    () => this.products.listUrl({ size: 60, sort: 'name' }),
    { defaultValue: EMPTY_PAGE },
  );

  protected readonly available = computed(() =>
    this.catalog.value().content.filter((product) => product.available),
  );

  protected add(product: Product): void {
    this.ticket.update((lines) =>
      lines.some((line) => line.product.id === product.id)
        ? lines.map((line) =>
            line.product.id === product.id ? { ...line, quantity: line.quantity + 1 } : line,
          )
        : [...lines, { product, quantity: 1 }],
    );
  }

  protected decrease(productId: Id): void {
    this.ticket.update((lines) =>
      lines
        .map((line) =>
          line.product.id === productId ? { ...line, quantity: line.quantity - 1 } : line,
        )
        .filter((line) => line.quantity > 0),
    );
  }

  protected clear(): void {
    this.ticket.set([]);
  }

  protected charge(): void {
    this.submitting.set(true);

    this.orders
      .create({
        lines: this.ticket().map((line) => ({
          productId: line.product.id,
          quantity: line.quantity,
        })),
        notes: 'Venta en mostrador',
      })
      .subscribe({
        next: (order) => {
          this.clear();
          this.submitting.set(false);
          this.notifications.success(`Venta ${order.code} registrada.`);
        },
        error: () => this.submitting.set(false),
      });
  }
}
