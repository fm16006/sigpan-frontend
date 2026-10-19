import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { Promotion } from '../../../../core/models/promotion.model';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { PromotionForm } from '../../ui/promotion-form/promotion-form';

/** Vigencia calculada por fecha local: el backend ya filtra por fecha, esto solo lo muestra. */
export type PromotionStatus = 'VIGENTE' | 'PROGRAMADA' | 'VENCIDA' | 'INACTIVA';

@Component({
  selector: 'app-promotion-list',
  imports: [PageHeader, ResourceState, DatePipe, MoneyPipe, PromotionForm],
  templateUrl: './promotion-list.html',
})
export class PromotionList {
  private readonly api = inject(ApiClient);

  protected readonly list = httpResource<Promotion[]>(() => this.api.url(API_ENDPOINTS.promociones.root), {
    defaultValue: [],
  });

  /** Promoción en edición; null mientras el formulario está en modo alta. */
  protected readonly editing = signal<Promotion | null>(null);
  protected readonly formOpen = signal(false);

  protected isPercentage(promotion: Promotion): boolean {
    return promotion.tipoDescuento === 'PORCENTAJE';
  }

  protected statusOf(promotion: Promotion): PromotionStatus {
    if (!promotion.activo) return 'INACTIVA';
    const hoy = todayIso();
    if (promotion.fechaInicio && hoy < promotion.fechaInicio) return 'PROGRAMADA';
    if (promotion.fechaFin && hoy > promotion.fechaFin) return 'VENCIDA';
    return 'VIGENTE';
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formOpen.set(true);
  }

  protected openEdit(promotion: Promotion): void {
    this.editing.set(promotion);
    this.formOpen.set(true);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  protected onSaved(): void {
    this.closeForm();
    this.list.reload();
  }
}
