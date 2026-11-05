import { Injectable, computed, inject, signal } from '@angular/core';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiClient } from '../http/api-client';
import { Id } from '../models/api.model';
import { ProductOffers } from '../models/offer.model';

/** Ofertas vigentes por producto; la página que las muestra llama a `load()`. */
@Injectable({ providedIn: 'root' })
export class OffersStore {
  private readonly api = inject(ApiClient);
  private readonly state = signal<readonly ProductOffers[]>([]);
  private readonly byProduct = computed(() => new Map(this.state().map((o) => [o.productoId, o] as const)));

  load(): void {
    this.api.get<ProductOffers[]>(API_ENDPOINTS.productos.ofertas).subscribe({
      next: (offers) => this.state.set(offers),
      error: () => this.state.set([]),
    });
  }

  of(productId: Id): ProductOffers | undefined {
    return this.byProduct().get(productId);
  }
}
