import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Id } from '../../../../core/models/api.model';
import { Auth } from '../../../../core/services/auth';
import { CartStore } from '../../../../core/services/cart-store';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { OrderService } from '../../services/order.service';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, PageHeader, EmptyState, MoneyPipe],
  templateUrl: './cart.html',
})
export class Cart {
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);
  private readonly router = inject(Router);

  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(Auth);
  protected readonly submitting = signal(false);

  protected updateQuantity(productId: Id, value: string): void {
    this.cart.setQuantity(productId, Number(value));
  }

  protected checkout(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/storefront/cart' },
      });
      return;
    }

    this.submitting.set(true);
    // Solo producto y cantidad: el backend fija precios y promociones.
    this.orders.create(this.cart.toOrderRequest()).subscribe({
      next: (order) => {
        this.cart.clear();
        this.notifications.success(`Pedido ${order.code} confirmado.`);
        void this.router.navigate(['/storefront/orders']);
      },
      error: () => this.submitting.set(false),
    });
  }
}
