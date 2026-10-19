import { Injectable, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { BranchScope } from '../../../../core/services/branch-scope';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct, isResale } from '../../../../core/models/catalog.model';
import { Combo, ComboLine } from '../../../../core/models/combo.model';
import { PriceScale } from '../../../../core/models/price-scale.model';
import { Formula, FormulaCost, FormulaLine } from '../../../../core/models/production.model';
import { Promotion, PromotionProductLink } from '../../../../core/models/promotion.model';
import { ItemPurchase } from '../../../../core/models/purchase.model';
import { Notifications } from '../../../../core/services/notifications';
import { PurchaseService } from '../../../purchases/services/purchase.service';
import { ProductInventory } from '../../models/product-detail.model';
import { CHANNEL_LABELS, ChannelKey, isChannelOn } from '../../product-channels';
import { ProductAdminService } from '../../services/product-admin.service';
import { marginPercent } from '../../product-view';

/**
 * Datos de la ficha del producto, compartidos por el encabezado y las pestañas. Se provee en
 * el componente de la ficha: se carga una vez y las pestañas solo lo leen.
 *
 * Los recursos que pueden no existir (receta, inventario) se leen siempre con `hasValue()`.
 */
@Injectable()
export class ProductContext {
  private readonly api = inject(ApiClient);
  private readonly route = inject(ActivatedRoute);
  private readonly purchaseService = inject(PurchaseService);
  private readonly productService = inject(ProductAdminService);
  private readonly notifications = inject(Notifications);
  /** Sucursal cuyas existencias se ven (la del usuario por defecto). */
  readonly scope = inject(BranchScope);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => Number(params.get('id')))), {
    initialValue: Number(this.route.snapshot.paramMap.get('id')),
  });

  /** La ficha pide abrir el panel de edición (lo usan también las pestañas). */
  readonly editing = signal(false);

  /** Canales con un cambio en vuelo: su interruptor queda quieto hasta que responda el backend. */
  private readonly pendingChannels = signal<ReadonlySet<ChannelKey>>(new Set());
  readonly channelPending = (channel: ChannelKey): boolean => this.pendingChannels().has(channel);

  readonly productRes = httpResource<CatalogProduct>(() =>
    this.api.url(API_ENDPOINTS.productos.byId(this.id()), this.scope.params()),
  );
  readonly stockRes = httpResource<ProductInventory>(() =>
    this.api.url(API_ENDPOINTS.inventarios.byProducto(this.id()), this.scope.params()),
  );
  // Se pide la lista y se filtra: /formulas/producto/:id responde 404 cuando no hay receta y el
  // interceptor lo mostraría como un aviso de error en un caso que es normal.
  private readonly formulasRes = httpResource<Formula[]>(() => this.api.url(API_ENDPOINTS.formulas.root), {
    defaultValue: [],
  });
  readonly scalesRes = httpResource<PriceScale[]>(() =>
    this.api.url(API_ENDPOINTS.escalasPrecio.byProducto(this.id())),
  );
  private readonly comboLinksRes = httpResource<ComboLine[]>(() =>
    this.api.url(API_ENDPOINTS.combosDetalles.byProducto(this.id())),
  );
  private readonly combosRes = httpResource<Combo[]>(() => this.api.url(API_ENDPOINTS.combos.root), {
    defaultValue: [],
  });
  private readonly promoLinksRes = httpResource<PromotionProductLink[]>(() =>
    this.api.url(API_ENDPOINTS.promocionesProductos.byProducto(this.id())),
  );
  private readonly promosRes = httpResource<Promotion[]>(() => this.api.url(API_ENDPOINTS.promociones.root), {
    defaultValue: [],
  });

  /** Últimas compras con su proveedor: solo se piden para los productos de reventa. */
  readonly purchasesRes = httpResource<ItemPurchase[]>(() => {
    const product = this.product();
    return product && isResale(product)
      ? this.purchaseService.latestUrl('producto', product.id, 10)
      : undefined;
  });

  readonly product = computed(() => (this.productRes.hasValue() ? this.productRes.value() : null));
  readonly resale = computed(() => isResale(this.product()));
  readonly purchases = computed<readonly ItemPurchase[]>(() =>
    this.purchasesRes.hasValue() ? this.purchasesRes.value() : [],
  );
  readonly stock = computed(() => (this.stockRes.hasValue() ? this.stockRes.value() : null));

  readonly formula = computed<Formula | null>(() => {
    if (!this.formulasRes.hasValue()) return null;
    const id = this.id();
    return this.formulasRes.value().find((formula) => formula.productoId === id) ?? null;
  });
  /** Se pregunta si ya terminó de buscar la receta (para no mostrar "sin receta" antes de tiempo). */
  readonly formulaLoading = computed(() => this.formulasRes.isLoading() && !this.formulasRes.hasValue());

  private readonly linesRes = httpResource<FormulaLine[]>(() => {
    const formula = this.formula();
    return formula ? this.api.url(API_ENDPOINTS.formulaDetalles.byFormula(formula.id)) : undefined;
  });
  private readonly costRes = httpResource<FormulaCost>(() => {
    const formula = this.formula();
    return formula ? this.api.url(API_ENDPOINTS.formulas.costoUnitario(formula.id)) : undefined;
  });

  readonly lines = computed<readonly FormulaLine[]>(() =>
    this.linesRes.hasValue() ? this.linesRes.value() : [],
  );
  readonly cost = computed(() => (this.costRes.hasValue() ? this.costRes.value() : null));
  /** Reventa: promedio ponderado de sus compras. Elaborado: costo unitario de su receta. */
  readonly costoUnitario = computed(() => {
    const product = this.product();
    if (isResale(product)) {
      const promedio = Number(product?.costoPromedio ?? 0);
      return promedio > 0 ? promedio : null;
    }
    const cost = this.cost();
    return cost ? Number(cost.costoUnitario) : null;
  });
  readonly margen = computed(() => marginPercent(this.product()?.precio, this.costoUnitario()));

  readonly scales = computed<readonly PriceScale[]>(() =>
    this.scalesRes.hasValue()
      ? [...this.scalesRes.value()].sort((a, b) => a.cantidadMinima - b.cantidadMinima)
      : [],
  );

  /** Combos que incluyen el producto, con el precio y el estado del combo. */
  readonly combos = computed(() => {
    if (!this.comboLinksRes.hasValue()) return [];
    const all = this.combosRes.hasValue() ? this.combosRes.value() : [];
    return this.comboLinksRes.value().map((line) => ({
      line,
      combo: all.find((combo) => combo.id === line.comboId) ?? null,
    }));
  });

  /** Promociones que incluyen el producto (se omiten los vínculos dados de baja). */
  readonly promotions = computed(() => {
    if (!this.promoLinksRes.hasValue()) return [];
    const all = this.promosRes.hasValue() ? this.promosRes.value() : [];
    return this.promoLinksRes
      .value()
      .filter((link) => (link as { activo?: boolean }).activo !== false)
      .map((link) => ({
        link,
        promotion: all.find((promotion) => promotion.id === link.promocionId) ?? null,
      }));
  });

  /** Nombre de una regla "TIPO:ID" del motor de promociones. */
  ruleName(regla: string | null | undefined): string {
    if (!regla) return '';
    const [tipo, rawId] = regla.split(':');
    const id: Id = Number(rawId);
    if (tipo === 'PROMOCION') {
      const promotion = this.promosRes.hasValue()
        ? this.promosRes.value().find((item) => item.id === id)
        : null;
      return promotion ? promotion.nombre : `Promoción #${rawId}`;
    }
    if (tipo === 'COMBO') {
      const combo = this.combosRes.hasValue() ? this.combosRes.value().find((item) => item.id === id) : null;
      return combo ? combo.nombre : `Combo #${rawId}`;
    }
    if (tipo === 'ESCALA') return 'Precio por mayoreo';
    return regla;
  }

  /**
   * Habilita o deshabilita el producto en un canal. Actualiza la ficha al instante y, si el backend
   * rechaza el cambio, vuelve al valor anterior (el aviso de error ya lo muestra el interceptor).
   */
  setChannel(channel: ChannelKey, enabled: boolean): void {
    const product = this.product();
    if (!product || this.channelPending(channel) || isChannelOn(product, channel) === enabled) {
      return;
    }
    const previous = isChannelOn(product, channel);

    this.patchChannel(channel, enabled);
    this.pendingChannels.update((pending) => new Set(pending).add(channel));

    this.productService.updateChannels(product.id, { [channel]: enabled }).subscribe({
      next: (updated) => {
        this.releaseChannel(channel);
        // Se confirma con lo que guardó el backend, sin tocar la existencia de la sucursal que se ve.
        this.patchChannel(channel, isChannelOn(updated, channel));
        const label = CHANNEL_LABELS[channel].label;
        this.notifications.success(
          `${label}: «${product.nombre}» quedó ${enabled ? 'habilitado' : 'deshabilitado'}.`,
        );
      },
      error: () => {
        this.releaseChannel(channel);
        this.patchChannel(channel, previous);
      },
    });
  }

  private patchChannel(channel: ChannelKey, value: boolean): void {
    const current = this.product();
    if (current) {
      this.productRes.set({ ...current, [channel]: value });
    }
  }

  private releaseChannel(channel: ChannelKey): void {
    this.pendingChannels.update((pending) => {
      const next = new Set(pending);
      next.delete(channel);
      return next;
    });
  }

  openEditor(): void {
    this.editing.set(true);
  }

  reloadProduct(): void {
    this.productRes.reload();
    this.stockRes.reload();
    this.purchasesRes.reload();
  }
}
