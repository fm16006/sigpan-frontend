import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import { Supplier, SupplierDraft } from '../../../core/models/purchase.model';

/** Catálogo de proveedores. */
@Injectable({ providedIn: 'root' })
export class SupplierService {
  private readonly api = inject(ApiClient);

  suppliersUrl(onlyActive = false): string {
    return this.api.url(API_ENDPOINTS.proveedores.root, { activo: onlyActive ? true : undefined });
  }

  supplierUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.proveedores.byId(id));
  }

  create(draft: SupplierDraft): Observable<Supplier> {
    return this.api.post<Supplier>(API_ENDPOINTS.proveedores.root, draft);
  }

  update(id: Id, draft: SupplierDraft): Observable<Supplier> {
    return this.api.put<Supplier>(API_ENDPOINTS.proveedores.byId(id), draft);
  }

  /** Desactivar conserva el historial de compras; reactivar lo habilita de nuevo. */
  setActive(id: Id, activo: boolean): Observable<Supplier> {
    return this.api.patch<Supplier>(API_ENDPOINTS.proveedores.activo(id), { activo });
  }
}
