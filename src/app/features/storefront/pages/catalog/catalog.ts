import { Component, computed, inject, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { EMPTY_PAGE, Page } from '../../../../core/models/api.model';
import {
  PRODUCT_CATEGORIES,
  PRODUCT_CATEGORY_LABELS,
  Product,
  ProductCategory,
} from '../../../../core/models/product.model';
import { CartStore } from '../../../../core/services/cart-store';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductService } from '../../services/product.service';

const PAGE_SIZE = 12;

@Component({
  selector: 'app-catalog',
  imports: [PageHeader, ResourceState, MoneyPipe],
  templateUrl: './catalog.html',
})
export class Catalog {
  private readonly products = inject(ProductService);
  private readonly cart = inject(CartStore);
  private readonly notifications = inject(Notifications);

  protected readonly categories = PRODUCT_CATEGORIES;
  protected readonly categoryLabels = PRODUCT_CATEGORY_LABELS;

  protected readonly category = signal<ProductCategory | null>(null);
  protected readonly search = signal('');

  /** Vuelve a la primera página en cuanto cambia un filtro. */
  protected readonly page = linkedSignal<{ category: string | null; search: string }, number>({
    source: () => ({ category: this.category(), search: this.search() }),
    computation: () => 0,
  });

  /** Se vuelve a pedir solo cuando cambia la URL calculada. */
  protected readonly catalog = httpResource<Page<Product>>(
    () =>
      this.products.catalogUrl({
        page: this.page(),
        size: PAGE_SIZE,
        category: this.category() ?? undefined,
        search: this.search() || undefined,
      }),
    { defaultValue: EMPTY_PAGE },
  );

  protected readonly items = computed(() => this.catalog.value().content);
  protected readonly totalPages = computed(() => this.catalog.value().totalPages);

  protected selectCategory(category: ProductCategory | null): void {
    this.category.set(category);
  }

  protected applySearch(term: string): void {
    this.search.set(term.trim());
  }

  protected addToCart(product: Product): void {
    this.cart.add(product);
    this.notifications.success(`${product.name} se agregó al carrito.`);
  }

  protected goToPage(delta: number): void {
    this.page.update((current) =>
      Math.min(Math.max(current + delta, 0), Math.max(this.totalPages() - 1, 0)),
    );
  }
}
