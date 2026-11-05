import { Component, computed, inject, input } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Id } from '../../../../core/models/api.model';
import { FormulaCost } from '../../../../core/models/production.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { RecipeService } from '../../services/recipe.service';

/** Costo unitario de una receta, calculado por el backend. Sin dato muestra una raya. */
@Component({
  selector: 'app-recipe-unit-cost',
  imports: [MoneyPipe],
  template: `
    @if (cost(); as value) {
      {{ value.costoUnitario | money }}
    } @else {
      <span class="text-base-content/45">—</span>
    }
  `,
})
export class RecipeUnitCost {
  private readonly service = inject(RecipeService);

  readonly formulaId = input.required<Id>();

  private readonly resource = httpResource<FormulaCost>(() => this.service.costUrl(this.formulaId()));
  protected readonly cost = computed(() => (this.resource.hasValue() ? this.resource.value() : null));
}
