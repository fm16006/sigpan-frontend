import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { Id } from '../../../core/models/api.model';
import { Transfer, TransferDraft } from '../../../core/models/transfer.model';

/** Traslados de materia prima y producto entre sucursales: listado, ficha y alta. */
@Injectable({ providedIn: 'root' })
export class TransferService {
  private readonly api = inject(ApiClient);

  /** Con `sucursalId`, los que salieron de esa sucursal o llegaron a ella. */
  transfersUrl(sucursalId?: Id | null): string {
    return this.api.url(API_ENDPOINTS.traslados.root, { sucursalId });
  }

  transferUrl(id: Id): string {
    return this.api.url(API_ENDPOINTS.traslados.byId(id));
  }

  create(draft: TransferDraft): Observable<Transfer> {
    return this.api.post<Transfer>(API_ENDPOINTS.traslados.root, draft);
  }
}
