import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Id } from '../../../core/models/api.model';
import { CategoryDraft, ManagedCategory } from '../../../core/models/category.model';

@Injectable({ providedIn: 'root' })
export class CategoryService extends CrudClient<ManagedCategory, CategoryDraft> {
  constructor() {
    super({ root: API_ENDPOINTS.categorias.root, byId: API_ENDPOINTS.categorias.byId });
  }

  /** URL del listado de categorías con su uso, para httpResource. */
  categoriesUrl(): string {
    return this.api.url(API_ENDPOINTS.categorias.root);
  }

  /** "Eliminar" en el backend desactiva la categoría: nunca se pierde lo que ya la usa. */
  deactivate(id: Id): Observable<void> {
    return this.remove(id);
  }

  activate(id: Id): Observable<ManagedCategory> {
    return this.api.patch<ManagedCategory>(API_ENDPOINTS.categorias.activar(id), {});
  }
}
