import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import { Branch, BranchDraft, Register, RegisterDraft } from '../../../core/models/branch.model';

/** Sucursales y sus cajas. Todo el CRUD es de administración; "mi sucursal" la usa el punto de venta. */
@Injectable({ providedIn: 'root' })
export class BranchService {
  private readonly api = inject(ApiClient);

  /** Todas las sucursales (solo administración). */
  listUrl(): string {
    return this.api.url(API_ENDPOINTS.sucursales.root);
  }

  byIdUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.sucursales.byId(id));
  }

  /** Sucursal del usuario de la sesión, con sus cajas activas. */
  mineUrl(): string {
    return this.api.url(API_ENDPOINTS.sucursales.mine);
  }

  usersUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.sucursales.usuarios(id));
  }

  create(draft: BranchDraft): Observable<Branch> {
    return this.api.post<Branch>(API_ENDPOINTS.sucursales.root, draft);
  }

  update(id: Id, draft: BranchDraft): Observable<Branch> {
    return this.api.put<Branch>(API_ENDPOINTS.sucursales.byId(id), draft);
  }

  deactivate(id: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.sucursales.byId(id));
  }

  createRegister(branchId: Id, draft: RegisterDraft): Observable<Register> {
    return this.api.post<Register>(API_ENDPOINTS.sucursales.cajas(branchId), draft);
  }

  updateRegister(branchId: Id, registerId: Id, draft: RegisterDraft): Observable<Register> {
    return this.api.put<Register>(API_ENDPOINTS.sucursales.cajaById(branchId, registerId), draft);
  }

  deactivateRegister(branchId: Id, registerId: Id): Observable<void> {
    return this.api.delete<void>(API_ENDPOINTS.sucursales.cajaById(branchId, registerId));
  }
}
