import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Id } from '../../../../core/models/api.model';
import { AppError } from '../../../../core/http/app-error';
import { Quote, QuoteLine, QuoteSuggestion, ruleLabel } from '../../../../core/models/quote.model';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { SavedAddress } from '../../../../core/models/user.model';
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
import { DeliveryMode, StockShortage } from '../../../../core/models/order.model';

@Component({
  selector: 'app-cart',
  imports: [DatePipe, FormsModule, RouterLink, PageHeader, EmptyState, MoneyPipe, IvaLine],
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
  private readonly api = inject(ApiClient);
  private readonly quoteLines = computed(() =>
    this.cart.lines().map((line) => ({ productoId: line.productId, cantidad: line.quantity })),
  );
  private readonly debouncedLines = debouncedSignal(this.quoteLines, 150);

  /** HU-32: la cotización es pública; sin sesión también se ve el total con descuentos. */
  protected readonly quote = httpResource<Quote>((): HttpResourceRequest | undefined => {
    const lineas = this.debouncedLines();
    return lineas.length > 0 ? { url: this.quotes.url, method: 'POST', body: { lineas } } : undefined;
  });

  // HU-39: datos de retiro o entrega.
  protected modalidad: DeliveryMode = 'RETIRO';
  protected fechaProgramada = '';
  protected direccionEntrega = '';
  protected telefonoContacto = '';
  protected metodoPago: 'EFECTIVO' | 'TARJETA' = 'EFECTIVO';
  protected readonly minFecha = localDateTime(new Date());

  /** HU-40: lo que faltó al confirmar, para ofrecer el ajuste. */
  protected readonly shortages = signal<readonly StockShortage[]>([]);
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

  /** HU-55: mayor anticipación de lo que es por encargo. */
  protected readonly encargoHoras = computed(() =>
    Math.max(0, ...this.cart.lines().map((line) => line.anticipacionHoras ?? 0)),
  );
  protected readonly minEncargo = computed(() => new Date(Date.now() + this.encargoHoras() * 3_600_000));
  protected readonly minEncargoInput = computed(() => localDateTime(this.minEncargo()));

  protected readonly suggestions = computed(() => this.quoteValue()?.sugerencias ?? []);

  /** HU-15: direcciones guardadas del cliente. */
  private readonly addressList = httpResource<SavedAddress[]>(
    () => (this.auth.isAuthenticated() ? this.api.url(API_ENDPOINTS.miCuenta.direcciones) : undefined),
    { defaultValue: [] },
  );
  protected readonly addresses = computed(() => valueOr(this.addressList, []));
  private readonly applyDefault = effect(() => {
    const preferida = this.addresses().find((a) => a.predeterminada);
    if (preferida && !this.direccionEntrega) {
      this.direccionEntrega = preferida.direccion + (preferida.referencia ? ` (${preferida.referencia})` : '');
      if (!this.telefonoContacto && preferida.telefono) this.telefonoContacto = preferida.telefono;
    }
  });

  protected useAddress(id: string): void {
    const a = this.addresses().find((x) => String(x.id) === id);
    if (!a) return;
    this.direccionEntrega = a.direccion + (a.referencia ? ` (${a.referencia})` : '');
    if (a.telefono) this.telefonoContacto = a.telefono;
  }

  protected applySuggestion(s: QuoteSuggestion): void {
    const line = this.cart.lines().find((l) => l.productId === s.productoId);
    if (line) {
      this.cart.setQuantity(s.productoId, line.quantity + s.faltan);
      return;
    }
    this.api.get<CatalogProduct[]>(API_ENDPOINTS.productos.activos).subscribe({
      next: (list) => {
        const product = list.find((p) => p.id === s.productoId);
        if (product) this.cart.add(product, s.faltan);
      },
    });
  }

  protected lineQuote(productId: Id): QuoteLine | undefined {
    return this.quoteByProduct().get(productId);
  }

  protected updateQuantity(productId: Id, value: string): void {
    this.cart.setQuantity(productId, Number(value));
  }

  protected adjust(shortage: StockShortage): void {
    this.cart.setQuantity(shortage.productoId, shortage.disponible);
    this.shortages.update((list) => list.filter((s) => s.productoId !== shortage.productoId));
  }

  protected adjustAll(): void {
    this.shortages().forEach((s) => this.cart.setQuantity(s.productoId, s.disponible));
    this.shortages.set([]);
  }

  protected checkout(): void {
    if (!this.auth.isAuthenticated()) {
      void this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/storefront/cart' },
      });
      return;
    }

    if (this.encargoHoras() > 0 && (!this.fechaProgramada || new Date(this.fechaProgramada) < this.minEncargo())) {
      this.notifications.error(`Los productos por encargo necesitan ${this.encargoHoras()} h de anticipación: elegí la fecha.`);
      return;
    }

    if (this.modalidad === 'ENTREGA' && !this.direccionEntrega.trim()) {
      this.notifications.error('Indicá la dirección de entrega.');
      return;
    }

    this.submitting.set(true);
    this.shortages.set([]);
    // Solo producto y cantidad: el backend fija precios, promociones e IVA. El total que se vio viaja
    // para que el servidor avise si cambió algo antes de confirmar.
    const seen = this.quoteValue()?.total;
    const request = {
      ...this.cart.toOrderRequest(),
      modalidad: this.modalidad,
      metodoPago: this.metodoPago,
      fechaProgramada: this.fechaProgramada || undefined,
      direccionEntrega: this.modalidad === 'ENTREGA' ? this.direccionEntrega.trim() : undefined,
      telefonoContacto: this.telefonoContacto.trim() || undefined,
      ...(seen == null ? {} : { totalEsperado: seen }),
    };
    this.orders.placeOrder(request).subscribe({
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
        if (error.code === 'EXISTENCIA_INSUFICIENTE') {
          this.shortages.set((error.shortages ?? []) as StockShortage[]);
        }
      },
    });
  }
}

function localDateTime(fecha: Date): string {
  const local = new Date(fecha.getTime() - fecha.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
