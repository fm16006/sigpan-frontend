import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { EMPTY_PAGE, Page } from '../../../../core/models/api.model';
import { Promotion } from '../../../../core/models/promotion.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { PromotionService } from '../../services/promotion.service';

@Component({
  selector: 'app-promotion-list',
  imports: [PageHeader, ResourceState, DatePipe, MoneyPipe],
  templateUrl: './promotion-list.html',
})
export class PromotionList {
  private readonly promotions = inject(PromotionService);

  protected readonly list = httpResource<Page<Promotion>>(
    () => this.promotions.listUrl({ size: 50, sort: '-startsAt' }),
    { defaultValue: EMPTY_PAGE },
  );

  protected readonly items = computed(() => this.list.value().content);
}
