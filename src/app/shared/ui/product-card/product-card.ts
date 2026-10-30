import { Component, computed, inject, input, output } from '@angular/core';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { showsPlusTax } from '../../../core/models/tax.model';
import { CompanyStore } from '../../../core/services/company-store';
import { OffersStore } from '../../../core/services/offers-store';
import { OfferBadge } from '../offer-badge/offer-badge';
import { MoneyPipe } from '../../pipes/money.pipe';
import { CategoryIcon, KIND_TONES, categoryKind } from '../category-icon/category-icon';

/** Tarjeta de producto de la tienda. Sin foto, muestra una ilustración según el tipo. */
@Component({
  selector: 'app-product-card',
  imports: [MoneyPipe, CategoryIcon, OfferBadge],
  templateUrl: './product-card.html',
  host: { class: 'block h-full' },
})
export class ProductCard {
  private readonly company = inject(CompanyStore);
  private readonly offerStore = inject(OffersStore);

  readonly product = input.required<CatalogProduct>();
  readonly added = output<CatalogProduct>();

  protected readonly kindText = computed(
    () => `${this.product().nombre} ${this.product().categoria}`,
  );
  protected readonly tone = computed(() => KIND_TONES[categoryKind(this.kindText())]);

  /** El IVA no va incluido en el precio publicado: el catálogo avisa "+ IVA" sin inventar montos. */
  protected readonly plusTax = computed(() => showsPlusTax(this.company.tax(), this.product().exentoIva));

  protected readonly offers = computed(() => this.offerStore.of(this.product().id));

  /** Lo decide el backend: agotado es true cuando disponible <= 0. */
  protected readonly soldOut = computed(() => this.product().agotado);
  protected readonly fewLeft = computed(() => {
    const { disponible, stockMinimo } = this.product();
    return disponible != null && disponible > 0 && disponible <= Math.max(stockMinimo ?? 0, 5);
  });
}
