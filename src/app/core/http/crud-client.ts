import { inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Id, Page, PageQuery } from '../models/api.model';
import { ApiClient, QueryParams } from './api-client';

/** Endpoints que debe exponer un recurso para usar CrudClient. */
export interface CrudEndpoints {
  readonly root: string;
  readonly byId: (id: Id) => string;
}

/**
 * Base para los servicios REST: cada recurso solo declara sus endpoints y hereda
 * los cinco verbos. TDraft va aparte de T porque el alta no envía id.
 */
export abstract class CrudClient<T, TDraft = Omit<T, 'id'>> {
  protected readonly api = inject(ApiClient);

  protected constructor(protected readonly endpoints: CrudEndpoints) {}

  list(query: PageQuery = {}): Observable<Page<T>> {
    return this.api.get<Page<T>>(this.endpoints.root, query as QueryParams);
  }

  getById(id: Id): Observable<T> {
    return this.api.get<T>(this.endpoints.byId(id));
  }

  create(draft: TDraft): Observable<T> {
    return this.api.post<T>(this.endpoints.root, draft);
  }

  update(id: Id, draft: Partial<TDraft>): Observable<T> {
    return this.api.put<T>(this.endpoints.byId(id), draft);
  }

  remove(id: Id): Observable<void> {
    return this.api.delete<void>(this.endpoints.byId(id));
  }

  /** URL del listado, para httpResource. */
  listUrl(query: PageQuery = {}): string {
    return this.api.url(this.endpoints.root, query as QueryParams);
  }
}
