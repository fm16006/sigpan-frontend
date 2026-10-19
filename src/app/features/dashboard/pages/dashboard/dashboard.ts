import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { CashCut, Sale } from '../../../../core/models/order.model';
import { RawMaterial } from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { BranchScope } from '../../../../core/services/branch-scope';
import { BranchScopePicker } from '../../../../shared/ui/branch-scope-picker/branch-scope-picker';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { valueOr } from '../../../../core/http/resource-value';

@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, PageHeader, StatCard, Icon, MoneyPipe, BranchScopePicker],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly api = inject(ApiClient);

  protected readonly auth = inject(Auth);
  protected readonly scope = inject(BranchScope);
  protected readonly crumbs = [{ label: 'Inicio' }, { label: 'Panel' }];

  protected readonly cut = httpResource<CashCut>(() => this.api.url(API_ENDPOINTS.orders.cashCut));
  protected readonly orders = httpResource<Sale[]>(() => this.api.url(API_ENDPOINTS.orders.queue), {
    defaultValue: [],
  });
  protected readonly materials = httpResource<RawMaterial[]>(
    () => this.api.url(API_ENDPOINTS.materiasPrimas.stockBajo, this.scope.params()),
    { defaultValue: [] },
  );

  protected readonly cutValue = computed(() => valueOr(this.cut, undefined));
  protected readonly pendingOrders = computed(
    () => valueOr(this.orders, []).filter((order) => ['PENDIENTE', 'EN_PREPARACION', 'LISTO'].includes(order.estado)).length,
  );
  protected readonly lowStock = computed(() => valueOr(this.materials, []).length);
  protected readonly loading = computed(
    () => this.cut.isLoading() || this.orders.isLoading() || this.materials.isLoading(),
  );

  protected reload(): void {
    this.cut.reload();
    this.orders.reload();
    this.materials.reload();
  }
}
