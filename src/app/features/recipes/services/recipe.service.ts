import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import {
  Formula,
  FormulaDraft,
  FormulaLine,
  FormulaLineDraft,
} from '../../../core/models/production.model';

@Injectable({ providedIn: 'root' })
export class RecipeService {
  private readonly api = inject(ApiClient);

  formulasUrl(): string {
    return this.api.url(API_ENDPOINTS.formulas.root);
  }

  productsUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.root);
  }

  materialsUrl(): string {
    return this.api.url(API_ENDPOINTS.materiasPrimas.root);
  }

  linesUrl(formulaId: Id): string {
    return this.api.url(API_ENDPOINTS.formulaDetalles.byFormula(formulaId));
  }

  costUrl(formulaId: Id): string {
    return this.api.url(API_ENDPOINTS.formulas.costoUnitario(formulaId));
  }

  createFormula(draft: FormulaDraft): Observable<Formula> {
    return this.api.post<Formula>(API_ENDPOINTS.formulas.root, draft);
  }

  updateFormula(id: Id, draft: FormulaDraft): Observable<Formula> {
    return this.api.put<Formula>(API_ENDPOINTS.formulas.byId(id), draft);
  }

  createLine(draft: FormulaLineDraft): Observable<FormulaLine> {
    return this.api.post<FormulaLine>(API_ENDPOINTS.formulaDetalles.root, draft);
  }

  updateLine(id: Id, draft: FormulaLineDraft): Observable<FormulaLine> {
    return this.api.put<FormulaLine>(API_ENDPOINTS.formulaDetalles.byId(id), draft);
  }

  removeLine(id: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.formulaDetalles.byId(id));
  }
}
