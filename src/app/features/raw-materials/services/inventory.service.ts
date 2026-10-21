import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import {
  ProductStock,
  RawMaterialStock,
  StockKind,
  StockMovement,
  StockMovementDraft,
} from '../../../core/models/inventory.model';
import { RawMaterial } from '../../../core/models/production.model';
import { RawMaterialDraft } from '../raw-material.model';

/** Materia prima, existencias y movimientos. Lo usan Materia prima y Movimientos. */
@Injectable({ providedIn: 'root' })
export class InventoryService {
  private readonly api = inject(ApiClient);

  materialsUrl(): string {
    return this.api.url(API_ENDPOINTS.materiasPrimas.root);
  }

  materialUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.materiasPrimas.byId(id));
  }

  productsUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.root);
  }

  formulasUrl(): string {
    return this.api.url(API_ENDPOINTS.formulas.root);
  }

  formulaLinesUrl(materialId: Id): string {
    return this.api.url(API_ENDPOINTS.formulaDetalles.byMateriaPrima(materialId));
  }

  /** Existencias del tipo de artículo. */
  stockUrl(kind: StockKind): string {
    return this.api.url(
      kind === 'materia-prima'
        ? API_ENDPOINTS.inventarios.materiasPrimas
        : API_ENDPOINTS.inventarios.productos,
    );
  }

  /** Todos los movimientos del tipo de artículo. */
  allMovementsUrl(kind: StockKind): string {
    return this.api.url(
      kind === 'materia-prima'
        ? API_ENDPOINTS.movimientos.materiasPrimas
        : API_ENDPOINTS.movimientos.productos,
    );
  }

  movementsUrl(kind: StockKind, itemId: Id): string {
    return this.api.url(
      kind === 'materia-prima'
        ? API_ENDPOINTS.movimientos.byMateriaPrima(itemId)
        : API_ENDPOINTS.movimientos.byProducto(itemId),
    );
  }

  createMaterial(draft: RawMaterialDraft): Observable<RawMaterial> {
    return this.api.post<RawMaterial>(API_ENDPOINTS.materiasPrimas.root, draft);
  }

  updateMaterial(id: Id, draft: RawMaterialDraft): Observable<RawMaterial> {
    return this.api.put<RawMaterial>(API_ENDPOINTS.materiasPrimas.byId(id), draft);
  }

  /** El backend no borra: marca la materia prima como inactiva. */
  deactivateMaterial(id: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.materiasPrimas.byId(id));
  }

  /** Habilita el inventario del artículo (existencia en cero) para que pueda recibir movimientos. */
  openStock(kind: StockKind, itemId: Id): Observable<RawMaterialStock | ProductStock> {
    const body =
      kind === 'materia-prima'
        ? { materiaPrimaId: itemId, cantidadMinima: 0 }
        : { productoId: itemId, cantidadMinima: 0 };
    return this.api.post<RawMaterialStock | ProductStock>(
      kind === 'materia-prima'
        ? API_ENDPOINTS.inventarios.materiasPrimas
        : API_ENDPOINTS.inventarios.productos,
      body,
    );
  }

  registerMovement(kind: StockKind, draft: StockMovementDraft): Observable<StockMovement> {
    return this.api.post<StockMovement>(
      kind === 'materia-prima'
        ? API_ENDPOINTS.movimientos.materiasPrimas
        : API_ENDPOINTS.movimientos.productos,
      draft,
    );
  }
}
