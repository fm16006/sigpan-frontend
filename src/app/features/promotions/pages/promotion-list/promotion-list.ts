import { Component, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { Promotion } from '../../../../core/models/production.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';

@Component({
  selector: 'app-promotion-list',
  imports: [PageHeader, ResourceState, DatePipe, MoneyPipe],
  templateUrl: './promotion-list.html',
})
export class PromotionList {
  private readonly api = inject(ApiClient);

  protected readonly list = httpResource<Promotion[]>(() => this.api.url(API_ENDPOINTS.promociones.root), {
    defaultValue: [],
  });

  protected isPercentage(promotion: Promotion): boolean {
    return promotion.tipoDescuento?.toUpperCase().startsWith('PORC') ?? false;
  }
}
