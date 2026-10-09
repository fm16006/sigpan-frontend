import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { EMPTY_PAGE, Page } from '../../../../core/models/api.model';
import { InventoryItem, isLowStock } from '../../../../core/models/inventory.model';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { InventoryService } from '../../services/inventory.service';

@Component({
  selector: 'app-inventory-list',
  imports: [PageHeader, ResourceState, DatePipe],
  templateUrl: './inventory-list.html',
})
export class InventoryList {
  private readonly inventory = inject(InventoryService);

  protected readonly isLowStock = isLowStock;

  protected readonly stock = httpResource<Page<InventoryItem>>(
    () => this.inventory.listUrl({ size: 50, sort: 'name' }),
    { defaultValue: EMPTY_PAGE },
  );

  protected readonly items = computed(() => this.stock.value().content);
  protected readonly lowStockCount = computed(() => this.items().filter(isLowStock).length);
}
