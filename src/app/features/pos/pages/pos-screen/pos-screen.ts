import { Component, DestroyRef, PLATFORM_ID, computed, inject, signal } from '@angular/core';
import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { DatePipe, isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { CashCut } from '../../../../core/models/order.model';
import { Quote, QuoteLine, ruleLabel } from '../../../../core/models/quote.model';
import { QuoteService } from '../../../../core/services/quote.service';
import { debouncedSignal } from '../../../../core/utils/debounced-signal';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { BackofficeMenu } from '../../../../shared/layout/backoffice-menu';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { BrandMark } from '../../../../shared/ui/brand-mark/brand-mark';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ThemeToggle } from '../../../../shared/ui/theme-toggle/theme-toggle';
import { OrderService } from '../../../storefront/services/order.service';
import { ProductService } from '../../../storefront/services/product.service';
import { PosLine } from '../../models/checkout.model';
import { CheckoutDialog } from '../../ui/checkout-dialog/checkout-dialog';
import { KeypadKey, PosKeypad, applyKeypadKey } from '../../ui/pos-keypad/pos-keypad';
import { ProductPreview } from '../../ui/product-preview/product-preview';
import { todayIso } from '../../../../core/utils/dates';

type PosTab = 'venta' | 'corte';

const POS_PATH = '/backoffice/pos';
/** Existencias al día sin recargar la página, igual que la cola de despacho. */
const CATALOG_REFRESH_MS = 30_000;
const TIME_FORMAT = new Intl.DateTimeFormat('es-SV', { hour: 'numeric', minute: '2-digit' });
const DAY_FORMAT = new Intl.DateTimeFormat('es-SV', {
  weekday: 'long',
  day: 'numeric',
  month: 'short',
});
const CATEGORY_TONES = [
  'border-primary bg-primary/10',
  'border-secondary bg-secondary/10',
  'border-accent bg-accent/10',
  'border-info bg-info/10',
  'border-success bg-success/10',
  'border-warning bg-warning/10',
] as const;

@Component({
  selector: 'app-pos-screen',
  imports: [
    RouterLink,
    ResourceState,
    MoneyPipe,
    DatePipe,
    BrandMark,
    ThemeToggle,
    ProductPreview,
    PosKeypad,
    CheckoutDialog,
  ],
  templateUrl: './pos-screen.html',
  host: { class: 'drawer block h-dvh bg-base-200' },
})
export class PosScreen {
  private readonly products = inject(ProductService);
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);
  private readonly menu = inject(BackofficeMenu);

  protected readonly auth = inject(Auth);
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);

  private readonly ticket = signal<readonly PosLine[]>([]);
  private readonly now = signal(new Date());

  protected readonly tab = signal<PosTab>('venta');
  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly selectedId = signal<Id | null>(null);
  protected readonly keypad = signal('');
  protected readonly checkoutOpen = signal(false);
  protected readonly cutDate = signal(todayIso());

  protected readonly clock = computed(() => TIME_FORMAT.format(this.now()));
  protected readonly day = computed(() => DAY_FORMAT.format(this.now()));

  protected readonly adminLinks = computed(() =>
    this.menu.items().filter((item) => item.path !== POS_PATH),
  );
  protected readonly showStore = this.menu.showStore;

  protected readonly lines = this.ticket.asReadonly();
  private readonly quotes = inject(QuoteService);

  /** Canasta que se cotiza: solo producto y cantidad. El backend fija precios y descuentos. */
  private readonly quoteLines = computed(() =>
    this.ticket().map((line) => ({ productoId: line.product.id, cantidad: line.quantity })),
  );
  private readonly debouncedLines = debouncedSignal(this.quoteLines, 250);

  protected readonly quote = httpResource<Quote>((): HttpResourceRequest | undefined => {
    const lineas = this.debouncedLines();
    return lineas.length > 0 ? { url: this.quotes.url, method: 'POST', body: { lineas } } : undefined;
  });
  /** El ticket cambió y la cotización todavía no lo refleja: no se cobra en ese lapso. */
  protected readonly quotePending = computed(() => this.quoteLines() !== this.debouncedLines());
  protected readonly quoteByProduct = computed(
    () => new Map((this.quote.value()?.lineas ?? []).map((line) => [line.productoId, line] as const)),
  );
  /** Total que cobra el backend (promociones, combos y mayoreo ya aplicados). */
  protected readonly total = computed(() => this.quote.value()?.total ?? 0);
  protected readonly ahorro = computed(() => this.quote.value()?.ahorro ?? 0);
  protected readonly reglaAplicada = computed(() => ruleLabel(this.quote.value()?.reglaAplicada));
  protected readonly ruleLabel = ruleLabel;
  protected readonly itemCount = computed(() =>
    this.ticket().reduce((sum, line) => sum + line.quantity, 0),
  );

  protected readonly catalog = httpResource<CatalogProduct[]>(() => this.products.activeUrl(), {
    defaultValue: [],
  });

  protected readonly categories = computed(() =>
    [...new Set(this.catalog.value().map((product) => product.categoria))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  protected readonly visible = computed(() => {
    const term = this.search().toLowerCase();
    const category = this.category();
    return this.catalog
      .value()
      .filter((product) => !category || product.categoria === category)
      .filter(
        (product) =>
          !term || product.nombre.toLowerCase().includes(term) || String(product.id) === term,
      )
      .sort((a, b) => a.categoria.localeCompare(b.categoria) || a.nombre.localeCompare(b.nombre));
  });

  protected readonly selected = computed(
    () => this.catalog.value().find((product) => product.id === this.selectedId()) ?? null,
  );

  protected readonly selectedDetail = httpResource<CatalogProduct>(() => {
    const id = this.selectedId();
    return id === null ? undefined : this.products.byIdUrl(id);
  });

  protected readonly selectedAvailable = computed(() => {
    const detail = this.selectedDetail.value();
    return detail?.id === this.selectedId() ? (detail?.disponible ?? null) : null;
  });

  protected readonly selectedLine = computed(
    () => this.ticket().find((line) => line.product.id === this.selectedId()) ?? null,
  );

  protected readonly cut = httpResource<CashCut>(() =>
    this.tab() === 'corte' ? this.orders.cashCutUrl(this.cutDate()) : undefined,
  );

  constructor() {
    const destroyRef = inject(DestroyRef);
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const clock = setInterval(() => this.now.set(new Date()), 30_000);
      const refresh = setInterval(() => this.catalog.reload(), CATALOG_REFRESH_MS);
      destroyRef.onDestroy(() => {
        clearInterval(clock);
        clearInterval(refresh);
      });
    }
  }

  protected toneFor(category: string): string {
    const index = this.categories().indexOf(category);
    return CATEGORY_TONES[Math.max(0, index) % CATEGORY_TONES.length];
  }

  protected pick(product: CatalogProduct): void {
    this.selectedId.set(product.id);
    this.add(product);
  }

  protected add(product: CatalogProduct, quantity = 1): void {
    if (this.soldOut(product)) {
      this.notifications.error(`${product.nombre} está agotado.`);
      return;
    }
    const current = this.ticket().find((line) => line.product.id === product.id)?.quantity ?? 0;
    if (!this.fitsStock(product, current + quantity)) {
      return;
    }
    this.ticket.update((lines) =>
      lines.some((line) => line.product.id === product.id)
        ? lines.map((line) =>
            line.product.id === product.id ? { ...line, quantity: line.quantity + quantity } : line,
          )
        : [...lines, { product, quantity }],
    );
  }

  protected addByCode(input: HTMLInputElement): void {
    const code = Number(input.value.trim());
    const product = this.catalog.value().find((item) => item.id === code);

    if (!product) {
      this.notifications.error(`No existe un producto con el código ${input.value.trim()}.`);
      input.select();
      return;
    }

    this.pick(product);
    input.value = '';
    input.focus();
  }

  protected step(amount: number): void {
    const line = this.selectedLine();
    if (line) {
      this.setQuantity(line.product.id, line.quantity + amount);
    }
  }

  protected removeSelected(): void {
    const line = this.selectedLine();
    if (line) {
      this.setQuantity(line.product.id, 0);
    }
  }

  protected press(key: KeypadKey): void {
    this.keypad.update((value) => applyKeypadKey(value, key));
  }

  protected applyQuantity(): void {
    const line = this.selectedLine();
    const quantity = Math.trunc(Number(this.keypad()));
    if (!line) {
      this.notifications.info('Seleccioná una línea del ticket para cambiar su cantidad.');
      return;
    }
    if (!quantity) {
      return;
    }
    if (this.setQuantity(line.product.id, quantity)) {
      this.keypad.set('');
    }
  }

  protected clear(): void {
    this.ticket.set([]);
    this.keypad.set('');
  }

  protected lineQuote(line: PosLine): QuoteLine | undefined {
    return this.quoteByProduct().get(line.product.id);
  }

  protected charge(): void {
    if (this.ticket().length > 0 && !this.quotePending() && !this.quote.error()) {
      this.checkoutOpen.set(true);
    }
  }

  protected finishSale(): void {
    this.checkoutOpen.set(false);
    // La venta descontó inventario: se recarga para que el POS vea la existencia nueva.
    this.catalog.reload();
    this.clear();
    this.selectedId.set(null);
    this.search.set('');
    this.category.set('');
  }

  protected showCut(): void {
    this.tab.set('corte');
    this.cut.reload();
  }

  /** Lo dice el backend (agotado). Si el detalle recién consultado es del mismo producto, manda ese. */
  protected soldOut(product: CatalogProduct): boolean {
    const detail = this.selectedDetail.value();
    return detail?.id === product.id ? detail.agotado : product.agotado;
  }

  /** Existencia conocida: la del detalle recién consultado o, si no, la del catálogo. */
  private stockOf(product: CatalogProduct): number | null {
    const detail = this.selectedDetail.value();
    if (detail?.id === product.id && detail.disponible != null) {
      return detail.disponible;
    }
    return product.disponible ?? null;
  }

  private fitsStock(product: CatalogProduct, quantity: number): boolean {
    const stock = this.stockOf(product);
    if (stock === null || quantity <= stock) {
      return true;
    }
    this.notifications.error(
      stock <= 0
        ? `${product.nombre} está agotado.`
        : `No hay más ${product.nombre}: solo quedan ${stock} en existencia.`,
    );
    return false;
  }

  private setQuantity(productId: Id, quantity: number): boolean {
    const line = this.ticket().find((item) => item.product.id === productId);
    if (line && quantity > line.quantity && !this.fitsStock(line.product, quantity)) {
      return false;
    }
    this.ticket.update((lines) =>
      lines
        .map((line) => (line.product.id === productId ? { ...line, quantity } : line))
        .filter((line) => line.quantity > 0),
    );
    return true;
  }
}
