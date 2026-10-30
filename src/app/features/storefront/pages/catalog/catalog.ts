import { Component, computed, inject, input, linkedSignal, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct, Category } from '../../../../core/models/catalog.model';
import { CategoryIcon } from '../../../../shared/ui/category-icon/category-icon';
import { ProductCard } from '../../../../shared/ui/product-card/product-card';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductService } from '../../services/product.service';
import { OffersStore } from '../../../../core/services/offers-store';
import { ShopCart } from '../../services/shop-cart';
import { valueOr } from '../../../../core/http/resource-value';

type SortOrder = 'destacados' | 'precio-asc' | 'precio-desc' | 'nombre';

interface CategorySection {
  readonly id: Id;
  readonly nombre: string;
  readonly products: readonly CatalogProduct[];
}

@Component({
  selector: 'app-catalog',
  imports: [ResourceState, CategoryIcon, ProductCard],
  templateUrl: './catalog.html',
})
export class Catalog {
  private readonly products = inject(ProductService);
  protected readonly shop = inject(ShopCart);

  constructor() {
    inject(OffersStore).load();
  }

  /** ?categoria=ID, para llegar filtrado desde el inicio. */
  readonly categoria = input<string>();

  protected readonly catalog = httpResource<CatalogProduct[]>(() => this.products.activeUrl(), {
    defaultValue: [],
  });
  protected readonly categoryList = httpResource<Category[]>(() => this.products.categoriesUrl(), {
    defaultValue: [],
  });

  protected readonly categoryId = linkedSignal<Id | null>(() => Number(this.categoria()) || null);
  protected readonly search = signal('');
  protected readonly sort = signal<SortOrder>('destacados');

  private readonly catalogItems = computed(() => valueOr(this.catalog, []));
  private readonly categoryItems = computed(() => valueOr(this.categoryList, []));

  /** Solo categorías que tienen algo que vender. */
  protected readonly categories = computed(() =>
    this.categoryItems()
      .map((category) => ({
        ...category,
        total: this.catalogItems().filter((product) => product.categoriaId === category.id).length,
      }))
      .filter((category) => category.total > 0),
  );

  protected readonly items = computed(() => {
    const term = normalize(this.search());
    const category = this.categoryId();
    const filtered = this.catalogItems()
      .filter((product) => category === null || product.categoriaId === category)
      .filter(
        (product) =>
          !term ||
          normalize(product.nombre).includes(term) ||
          normalize(product.descripcion ?? '').includes(term),
      );
    return sortProducts(filtered, this.sort());
  });

  /** Sin filtros se muestra el menú por secciones, como en una vitrina. */
  protected readonly grouped = computed(() => this.categoryId() === null && !this.search());

  protected readonly sections = computed<readonly CategorySection[]>(() =>
    this.categories()
      .map((category) => ({
        id: category.id,
        nombre: category.nombre,
        products: this.items().filter((product) => product.categoriaId === category.id),
      }))
      .filter((section) => section.products.length > 0),
  );

  protected readonly selectedName = computed(
    () => this.categories().find((category) => category.id === this.categoryId())?.nombre ?? null,
  );

  protected selectCategory(id: Id | null): void {
    this.categoryId.set(id);
  }

  protected applySearch(term: string): void {
    this.search.set(term.trim());
  }

  protected applySort(value: string): void {
    this.sort.set(value as SortOrder);
  }
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

function sortProducts(products: CatalogProduct[], order: SortOrder): CatalogProduct[] {
  const available = (product: CatalogProduct) => (product.agotado ? 1 : 0);
  const byOrder: Record<SortOrder, (a: CatalogProduct, b: CatalogProduct) => number> = {
    destacados: (a, b) =>
      available(a) - available(b) || Number(!!b.imagenUrl) - Number(!!a.imagenUrl),
    'precio-asc': (a, b) => Number(a.precio) - Number(b.precio),
    'precio-desc': (a, b) => Number(b.precio) - Number(a.precio),
    nombre: (a, b) => a.nombre.localeCompare(b.nombre),
  };
  return [...products].sort(byOrder[order]);
}
