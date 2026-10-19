import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BUSINESS_INFO } from '../../../../core/config/business.config';
import { CatalogProduct, Category } from '../../../../core/models/catalog.model';
import {
  CategoryIcon,
  KIND_TONES,
  categoryKind,
} from '../../../../shared/ui/category-icon/category-icon';
import { ProductCard } from '../../../../shared/ui/product-card/product-card';
import { ProductService } from '../../../storefront/services/product.service';
import { ShopCart } from '../../../storefront/services/shop-cart';

interface Step {
  readonly title: string;
  readonly text: string;
}

const FEATURED_COUNT = 8;
const DRINKS_COUNT = 4;

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage, CategoryIcon, ProductCard],
  templateUrl: './home.html',
})
export class Home {
  private readonly products = inject(ProductService);
  protected readonly shop = inject(ShopCart);
  protected readonly business = BUSINESS_INFO;

  private readonly catalog = httpResource<CatalogProduct[]>(() => this.products.activeUrl(), {
    defaultValue: [],
  });
  private readonly categoryList = httpResource<Category[]>(() => this.products.categoriesUrl(), {
    defaultValue: [],
  });

  protected readonly loading = computed(() => this.catalog.isLoading());

  /** Categorías con productos, con su ícono y cuántos productos tienen. */
  protected readonly categories = computed(() =>
    this.categoryList
      .value()
      .map((category) => ({
        ...category,
        tone: KIND_TONES[categoryKind(category.nombre)],
        total: this.catalog.value().filter((product) => product.categoriaId === category.id).length,
      }))
      .filter((category) => category.total > 0),
  );

  /** Lo disponible primero, y con foto antes que sin foto. */
  protected readonly featured = computed(() =>
    [...this.catalog.value()]
      .filter((product) => categoryKind(product.categoria) !== 'bebida')
      .sort((a, b) => rank(b) - rank(a))
      .slice(0, FEATURED_COUNT),
  );

  protected readonly drinks = computed(() =>
    this.catalog
      .value()
      .filter((product) => categoryKind(product.categoria) === 'bebida')
      .slice(0, DRINKS_COUNT),
  );

  protected readonly steps: readonly Step[] = [
    {
      title: 'Elegí',
      text: 'Recorré el catálogo y agregá al carrito tu pan, postres y bebidas.',
    },
    {
      title: 'Confirmá',
      text: 'Creá tu cuenta o ingresá con Google y enviá tu pedido en un clic.',
    },
    {
      title: 'Retirá',
      text: 'Te avisamos cuando esté listo. Pasá por él a la tienda, recién horneado.',
    },
  ];

  protected readonly promises: readonly Step[] = [
    {
      title: 'Masa madre de 24 horas',
      text: 'Fermentación lenta para una miga alveolada y una corteza que cruje.',
    },
    {
      title: 'Horneado cada mañana',
      text: 'Las primeras bandejas salen del horno antes de que abramos la puerta.',
    },
    {
      title: 'Ingredientes de verdad',
      text: 'Mantequilla, huevos frescos y frutas de temporada. Nada de premezclas.',
    },
  ];
}

function rank(product: CatalogProduct): number {
  return (product.agotado ? 0 : 2) + (product.imagenUrl ? 1 : 0);
}
