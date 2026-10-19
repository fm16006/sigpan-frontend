import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient, QueryParams } from '../../../core/http/api-client';
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

  /** `scope` (`sucursalId` o `todas`) elige de qué sucursal es la existencia; sin él, la de la tienda en línea. */
  productsUrl(scope?: QueryParams): string {
    return this.api.url(API_ENDPOINTS.productos.root, scope);
  }

  formulasUrl(): string {
    return this.api.url(API_ENDPOINTS.formulas.root);
  }

  formulaLinesUrl(materialId: Id): string {
    return this.api.url(API_ENDPOINTS.formulaDetalles.byMateriaPrima(materialId));
  }

  /**
   * Existencias del tipo de artículo. `scope` es la sucursal (`sucursalId`) o la suma de todas (`todas`);
   * sin él el backend usa la sucursal del usuario.
   */
  stockUrl(kind: StockKind, scope?: QueryParams): string {
    return this.api.url(
      kind === 'materia-prima'
        ? API_ENDPOINTS.inventarios.materiasPrimas
        : API_ENDPOINTS.inventarios.productos,
      scope,
    );
  }

  /** Todos los movimientos del tipo de artículo, de la sucursal (o de todas) que indique `scope`. */
  allMovementsUrl(kind: StockKind, scope?: QueryParams): string {
    return this.api.url(
      kind === 'materia-prima'
        ? API_ENDPOINTS.movimientos.materiasPrimas
        : API_ENDPOINTS.movimientos.productos,
      scope,
    );
  }

  movementsUrl(kind: StockKind, itemId: Id, scope?: QueryParams): string {
    return this.api.url(
      kind === 'materia-prima'
        ? API_ENDPOINTS.movimientos.byMateriaPrima(itemId)
        : API_ENDPOINTS.movimientos.byProducto(itemId),
      scope,
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

  /** Abre el inventario del artículo en una sucursal (la del usuario si no se indica). */
  openStock(
    kind: StockKind,
    itemId: Id,
    sucursalId?: Id | null,
  ): Observable<RawMaterialStock | ProductStock> {
    const branch = sucursalId == null ? {} : { sucursalId };
    const body =
      kind === 'materia-prima'
        ? { materiaPrimaId: itemId, cantidadMinima: 0, ...branch }
        : { productoId: itemId, cantidadMinima: 0, ...branch };
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
