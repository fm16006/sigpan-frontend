import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Id } from '../../../core/models/api.model';
import { Combo, ComboDraft, ComboLine, ComboLineDraft } from '../../../core/models/combo.model';

@Injectable({ providedIn: 'root' })
export class ComboService extends CrudClient<Combo, ComboDraft> {
  constructor() {
    super({ root: API_ENDPOINTS.combos.root, byId: API_ENDPOINTS.combos.byId });
  }

  /** Lista de combos (no paginada). */
  listAll(): Observable<Combo[]> {
    return this.api.get<Combo[]>(API_ENDPOINTS.combos.root);
  }

  comboLines(comboId: Id): Observable<ComboLine[]> {
    return this.api.get<ComboLine[]>(API_ENDPOINTS.combosDetalles.byCombo(comboId));
  }

  addLine(draft: ComboLineDraft): Observable<ComboLine> {
    return this.api.post<ComboLine>(API_ENDPOINTS.combosDetalles.root, draft);
  }

  removeLine(lineId: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.combosDetalles.byId(lineId));
  }
}
