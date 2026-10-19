import { Component, computed, inject, signal } from '@angular/core';
import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { Id } from '../../../../core/models/api.model';
import { AppError } from '../../../../core/http/app-error';
import { Quote, QuoteLine, ruleLabel } from '../../../../core/models/quote.model';
import { QuoteService } from '../../../../core/services/quote.service';
import { debouncedSignal } from '../../../../core/utils/debounced-signal';
import { Auth } from '../../../../core/services/auth';
import { CartStore } from '../../../../core/services/cart-store';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { IvaLine } from '../../../../shared/ui/iva-line/iva-line';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { OrderService } from '../../services/order.service';
import { valueOr } from '../../../../core/http/resource-value';

@Component({
  selector: 'app-cart',
  imports: [RouterLink, PageHeader, EmptyState, MoneyPipe, IvaLine],
  templateUrl: './cart.html',
})
export class Cart {
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);
  private readonly router = inject(Router);

  protected readonly cart = inject(CartStore);
  protected readonly auth = inject(Auth);
  protected readonly submitting = signal(false);

  private readonly quotes = inject(QuoteService);
  private readonly quoteLines = computed(() =>
    this.cart.lines().map((line) => ({ productoId: line.productId, cantidad: line.quantity })),
  );
  private readonly debouncedLines = debouncedSignal(this.quoteLines, 300);

  /** La cotización exige sesión (rol CLIENTE). Sin sesión el total no se muestra. */
  protected readonly quote = httpResource<Quote>((): HttpResourceRequest | undefined => {
    const lineas = this.debouncedLines();
    return this.auth.isAuthenticated() && lineas.length > 0
      ? { url: this.quotes.url, method: 'POST', body: { lineas } }
      : undefined;
  });
  protected readonly quotePending = computed(() => this.quoteLines() !== this.debouncedLines());
  protected readonly quoteValue = computed(() => valueOr(this.quote, undefined));
  protected readonly quoteByProduct = computed(
    () => new Map((this.quoteValue()?.lineas ?? []).map((line) => [line.productoId, line] as const)),
  );
  protected readonly ruleLabel = ruleLabel;
  /** El IVA no va incluido en los precios: se suma al total. */
  protected readonly addsIva = computed(() => {
    const quote = this.quoteValue();
    return !!quote?.aplicaIva && !quote.ivaIncluido;
  });

  protected lineQuote(productId: Id): QuoteLine | undefined {
    return this.quoteByProduct().get(productId);
  }

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
    // Solo producto y cantidad: el backend fija precios, promociones e IVA. El total que se vio viaja
    // para que el servidor avise si cambió algo antes de confirmar.
    const seen = this.quoteValue()?.total;
    const request = this.cart.toOrderRequest();
    this.orders.placeOrder(seen == null ? request : { ...request, totalEsperado: seen }).subscribe({
      next: (order) => {
        this.cart.clear();
        this.notifications.success(`Pedido #${order.id} confirmado.`);
        void this.router.navigate(['/storefront/orders']);
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        // El total cambió (precios, promociones o IVA): se vuelve a cotizar para que lo vea antes de confirmar.
        if (error.code === 'TOTAL_CAMBIO') {
          this.quote.reload();
        }
      },
    });
  }
}
