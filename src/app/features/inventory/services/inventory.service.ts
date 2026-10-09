import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { InventoryItem, InventoryItemDraft } from '../../../core/models/inventory.model';

@Injectable({ providedIn: 'root' })
export class InventoryService extends CrudClient<InventoryItem, InventoryItemDraft> {
  constructor() {
    super(API_ENDPOINTS.inventory);
  }

  lowStockUrl(): string {
    return this.api.url(API_ENDPOINTS.inventory.lowStock);
  }
}
