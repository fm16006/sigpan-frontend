import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import {
  MAX_IMAGE_MB,
  IMAGE_TYPES,
  ESPECIALIDAD_LABELS,
  PRODUCT_TYPE_LABELS,
} from '../../../../core/models/catalog.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { DetailHeader, DetailTab } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { PUBLICATION_LABELS, publicationStatus } from '../../product-channels';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { CHANNEL_KEYS, CHANNEL_LABELS, ChannelKey, isChannelOn } from '../../product-channels';
import { STOCK_CHIPS, stockState } from '../../product-view';
import { PurchaseItemRef } from '../../../purchases/purchase-calc';
import { PurchaseFormDrawer } from '../../../purchases/ui/purchase-form-drawer';
import { ProductAdminService } from '../../services/product-admin.service';
import { ProductDrawer } from '../../ui/product-drawer/product-drawer';
import { ProductContext } from './product-context';

/**
 * Ficha del producto: carga el producto, pinta la cabecera con sus pestañas y deja el
 * contenido a las rutas hijas (que leen los datos de `ProductContext`).
 */
@Component({
  selector: 'app-product-detail',
  imports: [
    RouterOutlet,
    RouterLink,
    DetailHeader,
    StatusChip,
    Icon,
    ResourceState,
    ConfirmDialog,
    ProductDrawer,
    PurchaseFormDrawer,
  ],
  providers: [ProductContext],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  templateUrl: './product-detail.html',
})
export class ProductDetail {
  protected readonly ctx = inject(ProductContext);
  private readonly service = inject(ProductAdminService);
  private readonly notifications = inject(Notifications);
  private readonly router = inject(Router);
  private readonly auth = inject(Auth);

  protected readonly canEdit = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  /** Quien carga compras: administración y bodega. */
  protected readonly canBuy = this.auth.hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  protected readonly typeLabels = PRODUCT_TYPE_LABELS;
  protected readonly acceptedTypes = IMAGE_TYPES.join(',');
  protected readonly especialidadLabels = ESPECIALIDAD_LABELS;
  protected readonly chips = STOCK_CHIPS;
  protected readonly publication = PUBLICATION_LABELS;
  protected readonly publicationOf = publicationStatus;
  protected readonly channelKeys = CHANNEL_KEYS;
  protected readonly channelLabels = CHANNEL_LABELS;
  protected readonly isChannelOn = isChannelOn;

  protected readonly menuOpen = signal(false);
  protected readonly confirmDelete = signal(false);
  protected readonly busy = signal(false);
  protected readonly purchaseOpen = signal(false);
  protected readonly purchasePreset = computed<PurchaseItemRef | null>(() => {
    const product = this.ctx.product();
    return product ? { kind: 'producto', id: product.id } : null;
  });

  protected readonly product = this.ctx.product;
  protected readonly state = computed(() => {
    const product = this.product();
    return product ? stockState(product) : null;
  });

  protected readonly crumbs = computed<readonly Crumb[]>(() => [
    { label: 'Inventario' },
    { label: 'Productos', link: '/backoffice/products' },
    { label: this.product()?.nombre ?? '' },
  ]);

  protected readonly tabs = computed<readonly DetailTab[]>(() => {
    const insumos = this.ctx.lines().length;
    const compras = this.ctx.purchases().length;
    const precios =
      this.ctx.scales().length + this.ctx.combos().length + this.ctx.promotions().length;
    // Un producto de reventa no lleva receta: en su lugar se ven sus compras.
    const recetaOCompras: readonly DetailTab[] = this.ctx.resale()
      ? [{ label: 'Compras', path: 'compras', count: compras > 0 ? compras : null }]
      : [{ label: 'Receta y costo', path: 'receta', count: insumos > 0 ? insumos : null }];
    return [
      { label: 'Resumen', path: '' },
      ...recetaOCompras,
      { label: 'Existencias', path: 'existencias' },
      { label: 'Precios', path: 'precios', count: precios > 0 ? precios : null },
      { label: 'Historial', path: 'historial' },
    ];
  });

  protected toggleChannel(channel: ChannelKey, event: Event): void {
    this.ctx.setChannel(channel, (event.target as HTMLInputElement).checked);
  }

  protected onDocumentClick(event: Event): void {
    if (this.menuOpen() && !(event.target as HTMLElement).closest('[data-more-menu]')) {
      this.menuOpen.set(false);
    }
  }

  protected uploadImage(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    const product = this.product();
    if (!file || !product) {
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      this.notifications.error('Formato no permitido. Usá JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      this.notifications.error(`La imagen supera ${MAX_IMAGE_MB} MB.`);
      return;
    }

    this.busy.set(true);
    this.service.uploadImage(product.id, file).subscribe({
      next: () => this.imageDone('Imagen actualizada.'),
      error: () => this.busy.set(false),
    });
  }

  protected removeImage(): void {
    const product = this.product();
    if (!product) {
      return;
    }
    this.menuOpen.set(false);
    this.busy.set(true);
    this.service.removeImage(product.id).subscribe({
      next: () => this.imageDone('Imagen eliminada.'),
      error: () => this.busy.set(false),
    });
  }

  protected remove(): void {
    const product = this.product();
    if (!product) {
      return;
    }

    this.busy.set(true);
    const deleteProduct = () =>
      this.service.remove(product.id).subscribe({
        next: () => {
          this.busy.set(false);
          this.confirmDelete.set(false);
          this.notifications.success(`Producto "${product.nombre}" eliminado.`);
          void this.router.navigate(['/backoffice/products']);
        },
        error: () => {
          this.busy.set(false);
          this.confirmDelete.set(false);
        },
      });

    if (product.imagenUrl) {
      this.service.removeImage(product.id).subscribe({
        next: deleteProduct,
        error: () => {
          this.busy.set(false);
          this.confirmDelete.set(false);
        },
      });
    } else {
      deleteProduct();
    }
  }

  protected onSaved(): void {
    this.ctx.editing.set(false);
    this.ctx.reloadProduct();
  }

  protected onPurchased(): void {
    this.purchaseOpen.set(false);
    this.ctx.reloadProduct();
  }

  private imageDone(message: string): void {
    this.busy.set(false);
    this.notifications.success(message);
    this.ctx.reloadProduct();
  }
}
