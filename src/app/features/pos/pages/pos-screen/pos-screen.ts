import {
  Component,
  DestroyRef,
  ElementRef,
  PLATFORM_ID,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BUSINESS_INFO } from '../../../../core/config/business.config';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { PriceScale } from '../../../../core/models/price-scale.model';
import { Quote, QuoteLine, ruleLabel } from '../../../../core/models/quote.model';
import { QuoteService } from '../../../../core/services/quote.service';
import { debouncedSignal } from '../../../../core/utils/debounced-signal';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { BackofficeMenu } from '../../../../shared/layout/backoffice-menu';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { BrandMark } from '../../../../shared/ui/brand-mark/brand-mark';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ThemeToggle } from '../../../../shared/ui/theme-toggle/theme-toggle';
import { PriceScaleService } from '../../../wholesale/services/price-scale.service';
import { ProductService } from '../../../storefront/services/product.service';
import { PosLine } from '../../models/checkout.model';
import {
  filterProducts,
  findByCode,
  nextTier,
  posShortcut,
  ruleBadge,
  tierHintText,
} from '../../pos-logic';
import { CheckoutDialog } from '../../ui/checkout-dialog/checkout-dialog';
import { PosApertura } from '../../ui/pos-apertura/pos-apertura';
import { PosCaja } from '../../ui/pos-caja/pos-caja';
import { valueOr } from '../../../../core/http/resource-value';

type PosView = 'venta' | 'caja' | 'apertura';

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
const ROLE_NAMES: Readonly<Record<string, string>> = {
  ADMINISTRADOR: 'Administración',
  CAJERO: 'Cajero',
};

@Component({
  selector: 'app-pos-screen',
  imports: [
    RouterLink,
    ResourceState,
    MoneyPipe,
    BrandMark,
    ThemeToggle,
    Icon,
    ConfirmDialog,
    CheckoutDialog,
    PosCaja,
    PosApertura,
  ],
  templateUrl: './pos-screen.html',
  host: {
    class: 'drawer block h-dvh bg-base-200',
    '(document:keydown)': 'onKeydown($event)',
  },
})
export class PosScreen {
  private readonly products = inject(ProductService);
  private readonly notifications = inject(Notifications);
  private readonly menu = inject(BackofficeMenu);
  private readonly priceScales = inject(PriceScaleService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly auth = inject(Auth);
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  protected readonly caja = BUSINESS_INFO.caja;

  private readonly ticket = signal<readonly PosLine[]>([]);
  private readonly now = signal(new Date());
  /** Tramos de mayoreo por producto, consultados una sola vez por sesión (HU-33). */
  protected readonly scales = signal<ReadonlyMap<Id, readonly PriceScale[]>>(new Map());
  private readonly scaleRequests = new Set<Id>();

  protected readonly view = signal<PosView>('venta');
  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly selectedId = signal<Id | null>(null);
  protected readonly checkoutOpen = signal(false);
  protected readonly clearOpen = signal(false);
  protected readonly logoutOpen = signal(false);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');

  protected readonly clock = computed(() => TIME_FORMAT.format(this.now()));
  protected readonly day = computed(() => DAY_FORMAT.format(this.now()));
  protected readonly roleName = computed(() => {
    const role = this.auth.user()?.role;
    return role ? (ROLE_NAMES[role] ?? role) : '';
  });

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
  private readonly quoteValue = computed(() => valueOr(this.quote, undefined));
  protected readonly quoteByProduct = computed(
    () => new Map((this.quoteValue()?.lineas ?? []).map((line) => [line.productoId, line] as const)),
  );
  protected readonly subtotal = computed(() => this.quoteValue()?.subtotal ?? 0);
  protected readonly descuento = computed(() => this.quoteValue()?.descuento ?? 0);
  /** Total que cobra el backend (promociones, combos y mayoreo ya aplicados). */
  protected readonly total = computed(() => this.quoteValue()?.total ?? 0);
  protected readonly ahorro = computed(() => this.quoteValue()?.ahorro ?? 0);
  protected readonly ruleLabel = ruleLabel;
  protected readonly itemCount = computed(() =>
    this.ticket().reduce((sum, line) => sum + line.quantity, 0),
  );

  protected readonly catalog = httpResource<CatalogProduct[]>(() => this.products.activeUrl(), {
    defaultValue: [],
  });

  private readonly catalogItems = computed(() => valueOr(this.catalog, []));

  protected readonly categories = computed(() =>
    [...new Set(this.catalogItems().map((product) => product.categoria))].sort((a, b) =>
      a.localeCompare(b),
    ),
  );

  protected readonly visible = computed(() =>
    filterProducts(this.catalogItems(), this.search(), this.category()),
  );

  protected readonly selected = computed(
    () => this.catalogItems().find((product) => product.id === this.selectedId()) ?? null,
  );

  protected readonly selectedDetail = httpResource<CatalogProduct>(() => {
    const id = this.selectedId();
    return id === null ? undefined : this.products.byIdUrl(id);
  });

  private readonly detailValue = computed(() => valueOr(this.selectedDetail, undefined));

  protected readonly selectedLine = computed(
    () => this.ticket().find((line) => line.product.id === this.selectedId()) ?? null,
  );

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const clock = setInterval(() => this.now.set(new Date()), 30_000);
      const refresh = setInterval(() => this.catalog.reload(), CATALOG_REFRESH_MS);
      this.destroyRef.onDestroy(() => {
        clearInterval(clock);
        clearInterval(refresh);
      });
    }
  }

  protected toneFor(category: string): string {
    const index = this.categories().indexOf(category);
    return CATEGORY_TONES[Math.max(0, index) % CATEGORY_TONES.length];
  }

  /** Insignia de oferta: solo si la última cotización muestra una regla para ese producto. */
  protected offerBadge(product: CatalogProduct): string {
    return ruleBadge(this.quoteByProduct().get(product.id)?.regla);
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
    this.loadScales(product.id);
  }

  /** Enter en el buscador: el código exacto agrega el producto; si no, el único resultado por nombre. */
  protected scan(): void {
    const text = this.search().trim();
    if (!text) {
      return;
    }
    const product =
      findByCode(this.catalogItems(), text) ??
      (this.visible().length === 1 ? this.visible()[0] : null);

    if (!product) {
      this.notifications.error(`No existe un producto con el código ${text}.`);
      this.searchInput()?.nativeElement.select();
      return;
    }

    this.pick(product);
    this.search.set('');
    this.focusSearch();
  }

  protected focusSearch(): void {
    this.searchInput()?.nativeElement.focus();
  }

  /** Línea sobre la que actúan +, − y Supr: la seleccionada o, si no hay, la última del ticket. */
  private activeLine(): PosLine | null {
    return this.selectedLine() ?? this.ticket().at(-1) ?? null;
  }

  protected step(amount: number, line: PosLine | null = this.activeLine()): void {
    if (line) {
      this.selectedId.set(line.product.id);
      this.setQuantity(line.product.id, line.quantity + amount);
    }
  }

  protected removeActive(): void {
    const line = this.activeLine();
    if (line) {
      this.setQuantity(line.product.id, 0);
    }
  }

  protected clear(): void {
    this.ticket.set([]);
    this.clearOpen.set(false);
  }

  protected requestLogout(): void {
    if (this.ticket().length > 0) {
      this.logoutOpen.set(true);
    } else {
      this.auth.logout();
    }
  }

  protected lineQuote(line: PosLine): QuoteLine | undefined {
    return this.quoteByProduct().get(line.product.id);
  }

  /** Aviso del siguiente tramo de mayoreo para la línea, o null si no aplica (HU-33). */
  protected tierHint(line: PosLine): string | null {
    const scales = this.scales().get(line.product.id);
    if (!scales?.length) {
      return null;
    }
    const lineQuote = this.lineQuote(line);
    const paying = lineQuote ? lineQuote.total / line.quantity : line.product.precio;
    const hint = nextTier(scales, line.quantity, Math.min(line.product.precio, paying));
    return hint ? tierHintText(hint) : null;
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
    this.ticket.set([]);
    this.selectedId.set(null);
    this.search.set('');
    this.category.set('');
    this.focusSearch();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.view() !== 'venta' || this.checkoutOpen() || this.clearOpen() || this.logoutOpen()) {
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = !!target?.closest('input, textarea, select, [contenteditable="true"]');
    const action = posShortcut(event.key, typing);
    if (!action) {
      return;
    }

    event.preventDefault();
    switch (action) {
      case 'buscar':
        this.focusSearch();
        break;
      case 'cobrar':
        this.charge();
        break;
      case 'mas':
        this.step(1);
        break;
      case 'menos':
        this.step(-1);
        break;
      case 'quitar':
        this.removeActive();
        break;
    }
  }

  /** Lo dice el backend (agotado). Si el detalle recién consultado es del mismo producto, manda ese. */
  protected soldOut(product: CatalogProduct): boolean {
    const detail = this.detailValue();
    return detail?.id === product.id ? detail.agotado : product.agotado;
  }

  /** Existencia conocida: la del detalle recién consultado o, si no, la del catálogo. */
  private stockOf(product: CatalogProduct): number | null {
    const detail = this.detailValue();
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

  /**
   * Consulta los tramos del producto la primera vez que entra al ticket. Si falla queda
   * sin aviso de tramo: la venta no depende de esto, y el interceptor ya avisó del error.
   */
  private loadScales(productId: Id): void {
    if (this.scaleRequests.has(productId)) {
      return;
    }
    this.scaleRequests.add(productId);
    this.priceScales
      .byProduct(productId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (scales) => this.scales.update((map) => new Map(map).set(productId, scales)),
        error: () => this.scales.update((map) => new Map(map).set(productId, [])),
      });
  }
}
