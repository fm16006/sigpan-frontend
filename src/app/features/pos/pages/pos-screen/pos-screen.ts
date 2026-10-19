import {
  Component,
  DestroyRef,
  ElementRef,
  Injector,
  PLATFORM_ID,
  afterNextRender,
  computed,
  effect,
  inject,
  signal,
  untracked,
  viewChild,
} from '@angular/core';
import { HttpResourceRequest, httpResource } from '@angular/common/http';
import { NgTemplateOutlet, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
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
import { MAX_ORDERS, PosOrder, hasLines, itemCount, orderTotal } from '../../pos-orders';
import { CashRegisterStore } from '../../services/cash-register.store';
import { PosOrdersStore } from '../../services/pos-orders.store';
import { CheckoutDialog } from '../../ui/checkout-dialog/checkout-dialog';
import { PosApertura } from '../../ui/pos-apertura/pos-apertura';
import { PosCaja } from '../../ui/pos-caja/pos-caja';
import { placeLabel } from '../../../branches/branch-utils';
import { valueOr } from '../../../../core/http/resource-value';

/** Qué ve el cajero: con la caja cerrada solo la apertura; abierta, la venta o el cierre. */
type PosMode = 'apertura' | 'venta' | 'cierre';

const POS_PATH = '/backoffice/pos';
const PANEL_PATH = '/backoffice';
const ONLINE_ORDERS_PATH = '/backoffice/orders';
/** Existencias al día sin recargar la página, igual que la cola de despacho. */
const CATALOG_REFRESH_MS = 30_000;
const TIME_FORMAT = new Intl.DateTimeFormat('es-SV', { hour: 'numeric', minute: '2-digit' });
const SHIFT_TIME_FORMAT = new Intl.DateTimeFormat('es-SV', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});
/** Desde `lg` el ticket va a la izquierda; debajo, barra inferior y hoja. Igual que Tailwind. */
const DESKTOP_QUERY = '(min-width: 1024px)';
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
    NgTemplateOutlet,
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
  private readonly register = inject(CashRegisterStore);
  private readonly orders = inject(PosOrdersStore);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);

  protected readonly auth = inject(Auth);
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  /** "Sucursal · Caja" del turno abierto, para la barra superior. */
  protected readonly place = computed(() => {
    const lugar = this.register.lugar();
    return placeLabel(lugar?.sucursal ?? this.auth.user()?.sucursal, lugar?.caja ?? 'Caja');
  });

  /** Líneas del pedido activo: todo lo que sigue (cotización, pasos, cobro) opera sobre él. */
  private readonly ticket = this.orders.lineas;
  protected readonly orderList = this.orders.pedidos;
  protected readonly activeName = computed(() => this.orders.activo().nombre);
  protected readonly activeOrderId = this.orders.activoId;
  protected readonly maxOrders = MAX_ORDERS;
  private readonly now = signal(new Date());
  /** Tramos de mayoreo por producto, consultados una sola vez por sesión (HU-33). */
  protected readonly scales = signal<ReadonlyMap<Id, readonly PriceScale[]>>(new Map());
  private readonly scaleRequests = new Set<Id>();

  /** El cajero pidió ver el cierre de caja (solo aplica con la caja abierta). */
  protected readonly closing = signal(false);
  protected readonly mode = computed<PosMode>(() =>
    this.register.estado() === 'cerrada' ? 'apertura' : this.closing() ? 'cierre' : 'venta',
  );
  protected readonly shift = this.register.turno;
  protected readonly shiftSince = computed(() => {
    const since = this.shift()?.abiertaEn;
    return since ? SHIFT_TIME_FORMAT.format(new Date(since)) : '';
  });
  /** Pantalla ancha: ticket fijo a la izquierda. En teléfono, barra inferior y hoja. */
  protected readonly desktop = signal(true);
  protected readonly sheetOpen = signal(false);
  protected readonly search = signal('');
  protected readonly category = signal('');
  protected readonly selectedId = signal<Id | null>(null);
  protected readonly checkoutOpen = signal(false);
  protected readonly clearOpen = signal(false);
  protected readonly logoutOpen = signal(false);
  protected readonly closeRegisterOpen = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly panelOpen = signal(false);
  /** Pedido que el cajero quiere descartar y está pendiente de confirmar. */
  protected readonly discardTarget = signal<PosOrder | null>(null);

  private readonly searchInput = viewChild<ElementRef<HTMLInputElement>>('searchInput');
  private readonly menuClose = viewChild<ElementRef<HTMLButtonElement>>('menuClose');
  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');

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
  /** Enlaces del menú del cajero: solo los que su rol puede ver. */
  protected readonly panelLink = computed(() =>
    this.adminLinks().find((item) => item.path === PANEL_PATH),
  );
  protected readonly onlineOrdersLink = computed(() =>
    this.adminLinks().find((item) => item.path === ONLINE_ORDERS_PATH),
  );
  /** Pedidos con algo cargado: los que se pierden si no se cobran. */
  protected readonly pending = this.orders.pendientes;
  protected readonly pendingItems = computed(() =>
    this.pending().reduce((sum, order) => sum + itemCount(order), 0),
  );

  protected readonly lines = this.ticket;
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

  /**
   * Total cotizado del pedido activo, solo si la cotización vigente es de estas líneas.
   * Mientras se recotiza (o tras un cambio de pedido) es null, para no mostrar el total de otro.
   */
  private readonly settledTotal = computed<number | null>(() => {
    const quote = this.quoteValue();
    const lines = this.ticket();
    if (
      !quote ||
      lines.length === 0 ||
      this.quotePending() ||
      this.quote.isLoading() ||
      quote.lineas.length !== lines.length
    ) {
      return null;
    }
    const matches = lines.every((line) =>
      quote.lineas.some(
        (item) => item.productoId === line.product.id && item.cantidad === line.quantity,
      ),
    );
    return matches ? quote.total : null;
  });

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
    this.watchViewport();

    // Los pedidos en espera no se recotizan: se guarda el último total de cada uno para su pestaña.
    effect(() => {
      const total = this.settledTotal();
      const id = this.orders.activoId();
      if (total !== null) {
        untracked(() => this.orders.guardarTotal(id, total));
      }
    });
    // Un pedido recuperado del navegador (o al cambiar de pedido) también necesita sus tramos.
    effect(() => {
      const lines = this.ticket();
      untracked(() => lines.forEach((line) => this.loadScales(line.product.id)));
    });
  }

  private watchViewport(): void {
    if (typeof matchMedia !== 'function') {
      return;
    }
    const query = matchMedia(DESKTOP_QUERY);
    const sync = () => this.desktop.set(query.matches);
    sync();
    query.addEventListener('change', sync);
    this.destroyRef.onDestroy(() => query.removeEventListener('change', sync));
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
    this.orders.cambiarLineas((lines) =>
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
    this.orders.cambiarLineas(() => []);
    this.clearOpen.set(false);
    this.sheetOpen.set(false);
  }

  /** "Cerrar caja" del menú: si hay pedidos sin cobrar, primero se confirma. */
  protected requestCloseRegister(): void {
    this.menuOpen.set(false);
    if (this.pending().length > 0) {
      this.closeRegisterOpen.set(true);
    } else {
      this.closing.set(true);
    }
  }

  protected confirmCloseRegister(): void {
    this.closeRegisterOpen.set(false);
    this.sheetOpen.set(false);
    this.closing.set(true);
  }

  /** El turno ya se cerró: los pedidos pendientes se descartan y la pantalla vuelve a "Abrir caja". */
  protected onRegisterClosed(): void {
    this.orders.reiniciar();
    this.selectedId.set(null);
    this.search.set('');
    this.category.set('');
    this.sheetOpen.set(false);
    this.closing.set(false);
  }

  protected requestLogout(): void {
    this.menuOpen.set(false);
    if (this.pending().length > 0) {
      this.logoutOpen.set(true);
    } else {
      this.auth.logout();
    }
  }

  /** "Panel administrativo": los pedidos quedan guardados, pero se avisa antes de salir. */
  protected requestPanel(): void {
    this.menuOpen.set(false);
    if (this.pending().length > 0) {
      this.panelOpen.set(true);
    } else {
      this.goToPanel();
    }
  }

  protected goToPanel(): void {
    this.panelOpen.set(false);
    void this.router.navigateByUrl(PANEL_PATH);
  }

  protected openMenu(): void {
    this.menuOpen.set(true);
    afterNextRender(() => this.menuClose()?.nativeElement.focus(), { injector: this.injector });
  }

  protected closeMenu(): void {
    if (this.menuOpen()) {
      this.menuOpen.set(false);
      this.menuTrigger()?.nativeElement.focus();
    }
  }

  protected orderHasLines(order: PosOrder): boolean {
    return hasLines(order);
  }

  protected orderItems(order: PosOrder): number {
    return itemCount(order);
  }

  /** Total para el rótulo: el cotizado vigente del activo y, para el resto, el último guardado. */
  protected pillTotal(order: PosOrder): number {
    const live = order.id === this.activeOrderId() ? this.settledTotal() : null;
    return live ?? orderTotal(order);
  }

  /** Un pedido se puede descartar si tiene líneas o si hay más de uno abierto. */
  protected canDiscard(order: PosOrder): boolean {
    return hasLines(order) || this.orderList().length > 1;
  }

  protected newOrder(): void {
    if (!this.orders.crear()) {
      this.notifications.info(
        `Ya hay ${MAX_ORDERS} pedidos abiertos. Cobrá o descartá uno para abrir otro.`,
      );
      return;
    }
    this.onOrderChanged();
  }

  protected switchTo(id: number): void {
    if (id !== this.activeOrderId()) {
      this.orders.cambiar(id);
      this.onOrderChanged();
    }
    this.menuOpen.set(false);
  }

  /** Ctrl+Tab y Ctrl+Mayús+Tab. */
  private cycleOrders(step: number): void {
    this.orders.ciclar(step);
    this.onOrderChanged();
  }

  /** Descartar: sin líneas se quita directo; con líneas, antes se confirma. */
  protected requestDiscard(order: PosOrder): void {
    if (hasLines(order)) {
      this.discardTarget.set(order);
    } else {
      this.discard(order);
    }
  }

  protected discard(order: PosOrder): void {
    const wasActive = order.id === this.activeOrderId();
    this.discardTarget.set(null);
    this.orders.quitar(order.id);
    if (wasActive) {
      this.onOrderChanged();
    }
  }

  /** Otro pedido pasó a ser el activo: la línea marcada del anterior ya no aplica. */
  private onOrderChanged(): void {
    this.selectedId.set(null);
    this.focusSearch();
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
      this.sheetOpen.set(false);
      this.checkoutOpen.set(true);
    }
  }

  protected finishSale(): void {
    this.checkoutOpen.set(false);
    // La venta descontó inventario: se recarga para que el POS vea la existencia nueva.
    this.catalog.reload();
    // Pedido cobrado: sale de la lista y el siguiente queda activo (o uno vacío si era el único).
    this.orders.quitar(this.activeOrderId());
    this.selectedId.set(null);
    this.search.set('');
    this.category.set('');
    this.focusSearch();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (
      this.mode() !== 'venta' ||
      this.checkoutOpen() ||
      this.clearOpen() ||
      this.logoutOpen() ||
      this.closeRegisterOpen() ||
      this.panelOpen() ||
      this.discardTarget()
    ) {
      return;
    }
    if (event.key === 'Escape' && this.menuOpen()) {
      this.closeMenu();
      return;
    }
    if (this.menuOpen()) {
      return;
    }
    if (event.key === 'Escape' && this.sheetOpen()) {
      this.sheetOpen.set(false);
      return;
    }
    const target = event.target as HTMLElement | null;
    const typing = !!target?.closest('input, textarea, select, [contenteditable="true"]');
    const action = posShortcut(event.key, typing, {
      ctrl: event.ctrlKey || event.metaKey,
      shift: event.shiftKey,
    });
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
      case 'nuevo-pedido':
        this.newOrder();
        break;
      case 'pedido-siguiente':
        this.cycleOrders(1);
        break;
      case 'pedido-anterior':
        this.cycleOrders(-1);
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
    this.orders.cambiarLineas((lines) =>
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
