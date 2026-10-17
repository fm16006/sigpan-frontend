import { Component, computed, input, output } from '@angular/core';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { MoneyPipe } from '../../pipes/money.pipe';
import { CategoryIcon, KIND_TONES, categoryKind } from '../category-icon/category-icon';

/** Tarjeta de producto de la tienda. Sin foto, muestra una ilustración según el tipo. */
@Component({
  selector: 'app-product-card',
  imports: [MoneyPipe, CategoryIcon],
  templateUrl: './product-card.html',
  host: { class: 'block h-full' },
})
export class ProductCard {
  readonly product = input.required<CatalogProduct>();
  readonly added = output<CatalogProduct>();

  protected readonly kindText = computed(
    () => `${this.product().nombre} ${this.product().categoria}`,
  );
  protected readonly tone = computed(() => KIND_TONES[categoryKind(this.kindText())]);

  protected readonly soldOut = computed(() => this.product().disponible === 0);
  protected readonly fewLeft = computed(() => {
    const { disponible, stockMinimo } = this.product();
    return disponible != null && disponible > 0 && disponible <= Math.max(stockMinimo ?? 0, 5);
  });
}
