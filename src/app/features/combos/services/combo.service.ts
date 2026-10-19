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

  /** URL del listado de combos (no paginado), para httpResource. */
  combosUrl(): string {
    return this.api.url(API_ENDPOINTS.combos.root);
  }

  comboUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.combos.byId(id));
  }

  /** Todas las líneas de todos los combos: la lista las usa para armar contenido, suma y disponibles. */
  allLinesUrl(): string {
    return this.api.url(API_ENDPOINTS.combosDetalles.root);
  }

  linesUrl(comboId: Id): string {
    return this.api.url(API_ENDPOINTS.combosDetalles.byCombo(comboId));
  }

  productsUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.root);
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
