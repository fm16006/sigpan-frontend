import { Component, computed, input } from '@angular/core';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { BrandMark } from '../../../../shared/ui/brand-mark/brand-mark';

@Component({
  selector: 'app-product-preview',
  imports: [MoneyPipe, BrandMark],
  templateUrl: './product-preview.html',
})
export class ProductPreview {
  readonly product = input<CatalogProduct | null>(null);
  readonly available = input<number | null>(null);
  readonly checkingStock = input(false);
  readonly inTicket = input(0);

  protected readonly lowStock = computed(() => {
    const available = this.available();
    const minimum = Number(this.product()?.stockMinimo ?? 0);
    return available !== null && available <= minimum;
  });
}
