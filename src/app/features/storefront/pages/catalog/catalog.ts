import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct, Category } from '../../../../core/models/catalog.model';
import { CartStore } from '../../../../core/services/cart-store';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductService } from '../../services/product.service';

@Component({
  selector: 'app-catalog',
  imports: [PageHeader, ResourceState, MoneyPipe],
  templateUrl: './catalog.html',
})
export class Catalog {
  private readonly products = inject(ProductService);
  private readonly cart = inject(CartStore);
  private readonly notifications = inject(Notifications);

  protected readonly catalog = httpResource<CatalogProduct[]>(() => this.products.activeUrl(), {
    defaultValue: [],
  });
  protected readonly categories = httpResource<Category[]>(() => this.products.categoriesUrl(), {
    defaultValue: [],
  });

  protected readonly categoryId = signal<Id | null>(null);
  protected readonly search = signal('');

  protected readonly items = computed(() => {
    const term = this.search().toLowerCase();
    const category = this.categoryId();
    return this.catalog
      .value()
      .filter((product) => category === null || product.categoriaId === category)
      .filter(
        (product) =>
          !term ||
          product.nombre.toLowerCase().includes(term) ||
          (product.descripcion ?? '').toLowerCase().includes(term),
      );
  });

  protected selectCategory(id: Id | null): void {
    this.categoryId.set(id);
  }

  protected applySearch(term: string): void {
    this.search.set(term.trim());
  }

  protected addToCart(product: CatalogProduct): void {
    this.cart.add(product);
    this.notifications.success(`${product.nombre} se agregó al carrito.`);
  }
}
