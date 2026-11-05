import { Component, computed, inject, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../../core/http/api-client';
import { Id } from '../../../../../core/models/api.model';
import { MaterialExplosion } from '../../../../../core/models/production.model';
import { MoneyPipe } from '../../../../../shared/pipes/money.pipe';
import { EmptyState } from '../../../../../shared/ui/empty-state/empty-state';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { StatCard } from '../../../../../shared/ui/stat-card/stat-card';
import { ProductContext } from '../product-context';

interface RecipeRow {
  readonly materiaPrimaId: Id;
  readonly nombre: string;
  readonly unidad: string;
  readonly cantidad: number;
  readonly costoPromedio: number | null;
  readonly subtotal: number | null;
  /** Peso del insumo en el costo del lote, en porcentaje. */
  readonly peso: number | null;
}

@Component({
  selector: 'app-product-recipe',
  imports: [RouterLink, DecimalPipe, MoneyPipe, Icon, StatCard, EmptyState],
  templateUrl: './product-recipe.html',
})
export class ProductRecipe {
  protected readonly ctx = inject(ProductContext);
  private readonly api = inject(ApiClient);

  protected readonly formula = this.ctx.formula;
  protected readonly lotes = signal(1);
  protected readonly unidades = computed(() => {
    const formula = this.formula();
    return formula ? this.lotes() * Number(formula.cantidadProduccion) : 0;
  });

  /** Líneas de la receta con su costo; si el costo no se pudo calcular, quedan sin importe. */
  protected readonly rows = computed<readonly RecipeRow[]>(() => {
    const cost = this.ctx.cost();
    const total = cost ? Number(cost.costoTotal) : 0;
    const costOf = (id: Id) => cost?.insumos.find((line) => line.materiaPrimaId === id);
    return this.ctx.lines().map((line) => {
      const costLine = costOf(line.materiaPrimaId);
      const subtotal = costLine ? Number(costLine.subtotal) : null;
      return {
        materiaPrimaId: line.materiaPrimaId,
        nombre: line.materiaPrima,
        unidad: line.unidadMedida,
        cantidad: Number(line.cantidad),
        costoPromedio: costLine ? Number(costLine.costoPromedio) : null,
        subtotal,
        peso: subtotal !== null && total > 0 ? Math.round((subtotal / total) * 100) : null,
      };
    });
  });

  protected readonly explosion = httpResource<MaterialExplosion>(() => {
    const formula = this.formula();
    return formula
      ? this.api.url(API_ENDPOINTS.formulas.explosion(formula.productoId), {
          cantidad: this.unidades(),
        })
      : undefined;
  });
  protected readonly explosionValue = computed(() =>
    this.explosion.hasValue() ? this.explosion.value() : null,
  );
  protected readonly faltantes = computed(() =>
    (this.explosionValue()?.insumos ?? []).filter((insumo) => !insumo.suficiente),
  );

  protected changeLotes(delta: number): void {
    this.lotes.update((value) => Math.max(1, value + delta));
  }

  protected missing(insumo: { cantidadRequerida: number; existencia: number }): number {
    return Math.max(0, Number(insumo.cantidadRequerida) - Number(insumo.existencia));
  }
}
