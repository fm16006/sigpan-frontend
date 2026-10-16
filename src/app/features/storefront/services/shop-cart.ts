import { Injectable, inject } from '@angular/core';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { CartStore } from '../../../core/services/cart-store';
import { Notifications } from '../../../core/services/notifications';

/** Agregar al carrito desde la tienda, sin pasarse de la existencia publicada. */
@Injectable({ providedIn: 'root' })
export class ShopCart {
  private readonly cart = inject(CartStore);
  private readonly notifications = inject(Notifications);

  add(product: CatalogProduct): void {
    const stock = product.disponible;
    if (stock != null && this.cart.quantityOf(product.id) + 1 > stock) {
      this.notifications.error(
        stock <= 0
          ? `${product.nombre} está agotado por hoy.`
          : `No hay más ${product.nombre}: solo quedan ${stock}.`,
      );
      return;
    }
    this.cart.add(product);
    this.notifications.success(`${product.nombre} se agregó al carrito.`);
  }
}
