import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import {
  MaterialExplosion,
  MaterialExplosionLine,
} from '../../../../core/models/production.model';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { RecipeService } from '../../services/recipe.service';
import { cantidadFaltante, insumosFaltantes } from './explosion-summary';

interface Consulta {
  readonly productoId: Id;
  readonly cantidad: number;
}

@Component({
  selector: 'app-material-explosion',
  imports: [ReactiveFormsModule, PageHeader, DecimalPipe],
  templateUrl: './material-explosion.html',
})
export class MaterialExplosionPage {
  private readonly service = inject(RecipeService);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });

  protected readonly form = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(0.001)]],
  });

  /** Ultima consulta pedida. Cada cambio dispara el calculo en el backend. */
  protected readonly consulta = signal<Consulta | null>(null);

  protected readonly explosion = httpResource<MaterialExplosion>(() => {
    const consulta = this.consulta();
    return consulta === null
      ? undefined
      : this.service.explosionUrl(consulta.productoId, consulta.cantidad);
  });

  protected readonly faltantes = computed<readonly MaterialExplosionLine[]>(() => {
    const resultado = this.explosion.value();
    return resultado ? insumosFaltantes(resultado.insumos) : [];
  });

  protected readonly mensajeError = computed<string | null>(() => {
    const error = this.explosion.error() as AppError | undefined;
    if (!error) {
      return null;
    }
    return error.kind === 'notFound'
      ? 'El producto no tiene una fórmula activa. Registra su receta primero.'
      : error.message;
  });

  protected calcular(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    this.consulta.set({ productoId: Number(value.productoId), cantidad: Number(value.cantidad) });
  }

  protected faltante(insumo: MaterialExplosionLine): number {
    return cantidadFaltante(insumo);
  }
}
