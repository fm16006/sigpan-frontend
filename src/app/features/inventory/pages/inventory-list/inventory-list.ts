import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { RawMaterial } from '../../../../core/models/production.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';

@Component({
  selector: 'app-inventory-list',
  imports: [PageHeader, ResourceState, DecimalPipe, MoneyPipe],
  templateUrl: './inventory-list.html',
})
export class InventoryList {
  private readonly api = inject(ApiClient);

  protected readonly onlyLow = signal(false);

  protected readonly materials = httpResource<RawMaterial[]>(
    () => this.api.url(API_ENDPOINTS.materiasPrimas.root),
    { defaultValue: [] },
  );

  protected readonly items = computed(() =>
    this.materials
      .value()
      .filter((item) => !this.onlyLow() || this.isLow(item))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  protected readonly lowCount = computed(
    () => this.materials.value().filter((item) => this.isLow(item)).length,
  );

  protected isLow(item: RawMaterial): boolean {
    return Number(item.stock) <= Number(item.stockMinimo);
  }
}
