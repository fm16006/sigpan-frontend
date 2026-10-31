import { Component, DestroyRef, PLATFORM_ID, computed, inject } from '@angular/core';
import { DecimalPipe, isPlatformBrowser } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { ORDER_STATUS_LABELS } from '../../../../core/models/order.model';
import { ManagementBoard } from '../../../../core/models/stock-control.model';
import { Auth } from '../../../../core/services/auth';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { valueOr } from '../../../../core/http/resource-value';

const REFRESH_MS = 60_000;

/** HU-53: cómo va el día de un vistazo. */
@Component({
  selector: 'app-dashboard',
  imports: [RouterLink, DecimalPipe, PageHeader, StatCard, Icon, MoneyPipe],
  templateUrl: './dashboard.html',
})
export class Dashboard {
  private readonly api = inject(ApiClient);

  protected readonly auth = inject(Auth);
  protected readonly crumbs = [{ label: 'Inicio' }, { label: 'Panel' }];
  protected readonly statusLabels = ORDER_STATUS_LABELS;

  protected readonly board = httpResource<ManagementBoard>(() => this.api.url(API_ENDPOINTS.tablero));
  protected readonly data = computed(() => valueOr(this.board, undefined));
  protected readonly loading = computed(() => this.board.isLoading());

  protected readonly channel = (canal: 'MOSTRADOR' | 'EN_LINEA') =>
    this.data()?.ventasPorCanal.find((c) => c.canal === canal) ?? { canal, ventas: 0, total: 0 };
  protected readonly pendingOrders = computed(() =>
    Object.values(this.data()?.pedidosPorEstado ?? {}).reduce((sum, n) => sum + n, 0),
  );
  protected readonly orderStates = computed(() =>
    Object.entries(this.data()?.pedidosPorEstado ?? {}).map(([estado, total]) => ({ estado, total })),
  );
  protected readonly maxSold = computed(() => Math.max(1, ...(this.data()?.masVendidos ?? []).map((m) => m.cantidad)));

  constructor() {
    if (isPlatformBrowser(inject(PLATFORM_ID))) {
      const timer = setInterval(() => this.board.reload(), REFRESH_MS);
      inject(DestroyRef).onDestroy(() => clearInterval(timer));
    }
  }

  protected reload(): void {
    this.board.reload();
  }
}
