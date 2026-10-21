import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import {
  Production,
  ProductionDraft,
  ProductionStatus,
} from '../../../core/models/production.model';

@Injectable({ providedIn: 'root' })
export class ProductionService {
  private readonly api = inject(ApiClient);

  listUrl(): string {
    return this.api.url(API_ENDPOINTS.producciones.root);
  }

  orderUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.producciones.byId(id));
  }

  /** Insumos que una orden terminada descargó del inventario. */
  detailsUrl(productionId: Id): string {
    return this.api.url(API_ENDPOINTS.produccionDetalle.byProduccion(productionId));
  }

  productsUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.root);
  }

  formulasUrl(): string {
    return this.api.url(API_ENDPOINTS.formulas.root);
  }

  formulaUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.formulas.byId(id));
  }

  /** Costo calculado por el backend (solo administración y jefe de producción). */
  costUrl(formulaId: Id): string {
    return this.api.url(API_ENDPOINTS.formulas.costoUnitario(formulaId));
  }

  materialsUrl(): string {
    return this.api.url(API_ENDPOINTS.materiasPrimas.root);
  }

  /** Explosión de materiales de la receta del producto para `cantidad` unidades. */
  explosionUrl(productoId: Id, cantidad: number): string {
    return this.api.url(API_ENDPOINTS.formulas.explosion(productoId), { cantidad });
  }

  create(draft: ProductionDraft): Observable<Production> {
    return this.api.post<Production>(API_ENDPOINTS.producciones.root, draft);
  }

  changeStatus(id: Id, estado: ProductionStatus): Observable<Production> {
    return this.api.patch<Production>(API_ENDPOINTS.producciones.status(id), {}, { estado });
  }
}
