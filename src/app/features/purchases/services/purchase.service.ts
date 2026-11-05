import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import { Purchase, PurchaseDraft } from '../../../core/models/purchase.model';
import { PurchaseItemKind } from '../purchase-calc';

export interface PurchaseFilters {
  readonly proveedorId?: Id | null;
  /** "YYYY-MM-DD", inclusive. */
  readonly desde?: string;
  readonly hasta?: string;
}

/** Compras a proveedores: listado, ficha, alta y últimas compras de un ítem. */
@Injectable({ providedIn: 'root' })
export class PurchaseService {
  private readonly api = inject(ApiClient);

  purchasesUrl(filters: PurchaseFilters = {}): string {
    return this.api.url(API_ENDPOINTS.compras.root, {
      proveedorId: filters.proveedorId,
      desde: filters.desde,
      hasta: filters.hasta,
    });
  }

  purchaseUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.compras.byId(id));
  }

  /** Últimas compras de un insumo o de un producto de reventa, con su proveedor. */
  latestUrl(kind: PurchaseItemKind, itemId: Id, limit = 5): string {
    return this.api.url(API_ENDPOINTS.compras.ultimas, {
      [kind === 'producto' ? 'productoId' : 'materiaPrimaId']: itemId,
      limite: limit,
    });
  }

  /** Productos de reventa: los únicos que se pueden comprar. */
  resaleProductsUrl(): string {
    return this.api.url(API_ENDPOINTS.productos.root, { tipo: 'REVENTA' });
  }

  create(draft: PurchaseDraft): Observable<Purchase> {
    return this.api.post<Purchase>(API_ENDPOINTS.compras.root, draft);
  }
}
