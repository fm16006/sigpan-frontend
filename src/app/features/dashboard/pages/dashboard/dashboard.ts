import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { EMPTY_SUMMARY, SalesSummary } from '../../../../core/models/report.model';
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

  protected readonly summary = httpResource<SalesSummary>(
    () => this.api.url(API_ENDPOINTS.reports.summary),
    { defaultValue: EMPTY_SUMMARY },
  );
}
