import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { Id } from '../../../../core/models/api.model';
import { Formula, FormulaLine } from '../../../../core/models/production.model';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';

@Component({
  selector: 'app-recipe-list',
  imports: [PageHeader, ResourceState, DecimalPipe],
  templateUrl: './recipe-list.html',
})
export class RecipeList {
  private readonly api = inject(ApiClient);

  protected readonly openId = signal<Id | null>(null);

  protected readonly formulas = httpResource<Formula[]>(() => this.api.url(API_ENDPOINTS.formulas.root), {
    defaultValue: [],
  });

  protected readonly lines = httpResource<FormulaLine[]>(
    () => {
      const id = this.openId();
      return id === null ? undefined : this.api.url(API_ENDPOINTS.formulaDetalles.byFormula(id));
    },
    { defaultValue: [] },
  );

  protected toggle(id: Id): void {
    this.openId.update((current) => (current === id ? null : id));
  }
}
