import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { CashCut, Sale } from '../../../../core/models/order.model';
import { RawMaterial } from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, StatCard, MoneyPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly api = inject(ApiClient);

  protected readonly auth = inject(Auth);

  protected readonly cut = httpResource<CashCut>(() => this.api.url(API_ENDPOINTS.orders.cashCut));
  protected readonly orders = httpResource<Sale[]>(() => this.api.url(API_ENDPOINTS.orders.queue), {
    defaultValue: [],
  });
  protected readonly materials = httpResource<RawMaterial[]>(
    () => this.api.url(API_ENDPOINTS.materiasPrimas.root),
    { defaultValue: [] },
  );

  protected readonly pendingOrders = computed(
    () => this.orders.value().filter((order) => ['PENDIENTE', 'EN_PREPARACION', 'LISTO'].includes(order.estado)).length,
  );
  protected readonly lowStock = computed(
    () => this.materials.value().filter((item) => Number(item.stock) <= Number(item.stockMinimo)).length,
  );
  protected readonly loading = computed(
    () => this.cut.isLoading() || this.orders.isLoading() || this.materials.isLoading(),
  );

  protected reload(): void {
    this.cut.reload();
    this.orders.reload();
    this.materials.reload();
  }
}
