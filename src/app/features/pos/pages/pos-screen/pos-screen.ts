import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { CashCut } from '../../../../core/models/order.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { OrderService } from '../../../storefront/services/order.service';
import { ProductService } from '../../../storefront/services/product.service';

interface TicketLine {
  readonly product: CatalogProduct;
  readonly quantity: number;
}

type PosTab = 'venta' | 'corte';

@Component({
  selector: 'app-pos-screen',
  imports: [PageHeader, ResourceState, MoneyPipe, DatePipe],
  templateUrl: './pos-screen.html',
})
export class PosScreen {
  private readonly products = inject(ProductService);
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);

  private readonly ticket = signal<readonly TicketLine[]>([]);

  protected readonly tab = signal<PosTab>('venta');
  protected readonly search = signal('');
  protected readonly cutDate = signal(today());
  protected readonly submitting = signal(false);

  protected readonly lines = this.ticket.asReadonly();
  protected readonly total = computed(() =>
    this.ticket().reduce((sum, line) => sum + Number(line.product.precio) * line.quantity, 0),
  );
  protected readonly itemCount = computed(() =>
    this.ticket().reduce((sum, line) => sum + line.quantity, 0),
  );

  protected readonly catalog = httpResource<CatalogProduct[]>(() => this.products.activeUrl(), {
    defaultValue: [],
  });

  protected readonly visible = computed(() => {
    const term = this.search().toLowerCase();
    return this.catalog
      .value()
      .filter(
        (product) =>
          !term ||
          product.nombre.toLowerCase().includes(term) ||
          String(product.id) === term,
      );
  });

  protected readonly cut = httpResource<CashCut>(() =>
    this.tab() === 'corte' ? this.orders.cashCutUrl(this.cutDate()) : undefined,
  );

  protected add(product: CatalogProduct, quantity = 1): void {
    this.ticket.update((lines) =>
      lines.some((line) => line.product.id === product.id)
        ? lines.map((line) =>
            line.product.id === product.id
              ? { ...line, quantity: line.quantity + quantity }
              : line,
          )
        : [...lines, { product, quantity }],
    );
  }

  protected addByCode(input: HTMLInputElement, quantityInput: HTMLInputElement): void {
    const code = Number(input.value.trim());
    const quantity = Math.max(1, Math.trunc(Number(quantityInput.value) || 1));
    const product = this.catalog.value().find((item) => item.id === code);

    if (!product) {
      this.notifications.error(`No existe un producto con el código ${input.value.trim()}.`);
      input.select();
      return;
    }

    this.add(product, quantity);
    input.value = '';
    quantityInput.value = '1';
    input.focus();
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

  protected removeLine(productId: Id): void {
    this.ticket.update((lines) => lines.filter((line) => line.product.id !== productId));
  }

  protected clear(): void {
    this.ticket.set([]);
  }

  protected charge(): void {
    if (this.ticket().length === 0 || this.submitting()) {
      return;
    }

    this.submitting.set(true);
    this.orders
      .counterSale({
        lineas: this.ticket().map((line) => ({
          productoId: line.product.id,
          cantidad: line.quantity,
        })),
      })
      .subscribe({
        next: (sale) => {
          this.clear();
          this.submitting.set(false);
          this.notifications.success(`Venta #${sale.id} registrada por ${formatMoney(sale.total)}.`);
        },
        error: () => this.submitting.set(false),
      });
  }

  protected showCut(): void {
    this.tab.set('corte');
    this.cut.reload();
  }
}

function today(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

function formatMoney(value: number): string {
  return `$${Number(value).toFixed(2)}`;
}
