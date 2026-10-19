import { Component, computed, inject } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ESPECIALIDAD_LABELS } from '../../../../../core/models/catalog.model';
import { todayIso } from '../../../../../core/utils/dates';
import { MoneyPipe } from '../../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { PROMOTION_CHIPS, promotionState, stockPercent, stockState } from '../../../product-view';
import { ProductContext } from '../product-context';

@Component({
  selector: 'app-product-summary',
  imports: [RouterLink, DecimalPipe, MoneyPipe, Icon],
  templateUrl: './product-summary.html',
})
export class ProductSummary {
  protected readonly ctx = inject(ProductContext);
  protected readonly especialidadLabels = ESPECIALIDAD_LABELS;
  protected readonly promotionChips = PROMOTION_CHIPS;
  private readonly today = todayIso();

  protected readonly product = this.ctx.product;
  protected readonly percent = computed(() => {
    const product = this.product();
    return product ? stockPercent(product) : 0;
  });
  protected readonly barClass = computed(() => {
    const product = this.product();
    switch (product ? stockState(product) : null) {
      case 'agotado':
        return 'bg-error';
      case 'reabastecer':
        return 'bg-warning';
      case 'disponible':
        return 'bg-success';
      default:
        return 'bg-base-content/30';
    }
  });

  /** Alérgenos como lista, a partir del texto libre separado por comas. */
  protected readonly alergenos = computed(() =>
    (this.product()?.alergenos ?? '')
      .split(/[,;]/)
      .map((item) => item.trim())
      .filter(Boolean),
  );

  /** Promociones que aplican hoy o van a aplicar; las vencidas o inactivas no se listan. */
  protected readonly promos = computed(() =>
    this.ctx.promotions().filter(({ promotion }) => {
      if (promotion === null) return true;
      const state = promotionState(promotion, this.today);
      return state === 'vigente' || state === 'programada';
    }),
  );
  protected readonly combosActivos = computed(() =>
    this.ctx.combos().filter(({ combo }) => combo === null || combo.activo),
  );

  protected stateOf(promotion: Parameters<typeof promotionState>[0]) {
    return promotionState(promotion, this.today);
  }

  protected until(date: string | null): string {
    return date ? new Date(`${date}T00:00:00`).toLocaleDateString('es-SV', { day: 'numeric', month: 'short' }) : '';
  }
}
