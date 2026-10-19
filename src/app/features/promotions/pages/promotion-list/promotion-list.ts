import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { forkJoin, of, switchMap } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { asAppError } from '../../../../core/http/as-app-error';
import { Id } from '../../../../core/models/api.model';
import { Promotion, PromotionProductLink } from '../../../../core/models/promotion.model';
import { Notifications } from '../../../../core/services/notifications';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ChipTone, StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import {
  PROMOTION_SEGMENTS,
  PROMOTION_STATUS_LABELS,
  PromotionSegment,
  PromotionStatus,
  countBySegment,
  filterPromotions,
  promotionStatus,
  scopeLabel,
  vigenciaLabel,
} from '../../promotion-utils';
import { PromotionService } from '../../services/promotion.service';
import { PromotionForm } from '../../ui/promotion-form/promotion-form';
import { valueOr } from '../../../../core/http/resource-value';

const STATUS_TONES: Readonly<Record<PromotionStatus, ChipTone>> = {
  VIGENTE: 'ok',
  PROGRAMADA: 'warn',
  VENCIDA: 'bad',
  INACTIVA: 'neutral',
};

@Component({
  selector: 'app-promotion-list',
  imports: [PageHeader, ResourceState, Icon, StatusChip, ConfirmDialog, DecimalPipe, MoneyPipe, PromotionForm],
  templateUrl: './promotion-list.html',
})
export class PromotionList {
  private readonly api = inject(ApiClient);
  private readonly service = inject(PromotionService);
  private readonly notifications = inject(Notifications);

  protected readonly crumbs = [{ label: 'Precios' }, { label: 'Promociones' }];
  protected readonly segments = PROMOTION_SEGMENTS;

  protected readonly list = httpResource<Promotion[]>(() => this.api.url(API_ENDPOINTS.promociones.root), {
    defaultValue: [],
  });
  /** Vínculos de todas las promociones: de ahí sale "Individual" o "Bloque · N productos". */
  protected readonly links = httpResource<PromotionProductLink[]>(
    () => this.api.url(API_ENDPOINTS.promocionesProductos.root),
    { defaultValue: [] },
  );

  protected readonly listItems = computed(() => valueOr(this.list, []));
  private readonly linkItems = computed(() => valueOr(this.links, []));

  protected readonly segment = signal<PromotionSegment>('TODAS');
  protected readonly term = signal('');

  /** Promoción en edición; null mientras el drawer está en modo alta. */
  protected readonly editing = signal<Promotion | null>(null);
  protected readonly formOpen = signal(false);
  protected readonly deleting = signal<Promotion | null>(null);
  protected readonly deleteBusy = signal(false);

  private readonly today = todayIso();

  protected readonly productCounts = computed(() => {
    const counts = new Map<Id, number>();
    for (const link of this.linkItems()) {
      counts.set(link.promocionId, (counts.get(link.promocionId) ?? 0) + 1);
    }
    return counts;
  });

  protected readonly counts = computed(() => countBySegment(this.listItems(), this.today));

  protected readonly items = computed(() =>
    filterPromotions(this.listItems(), { segment: this.segment(), term: this.term() }, this.today),
  );

  protected readonly deleteMessage = computed(() => {
    const promotion = this.deleting();
    if (!promotion) return '';
    const n = this.productCounts().get(promotion.id) ?? 0;
    const effect =
      n > 0
        ? `Se quita también de ${n === 1 ? 'su producto' : `sus ${n} productos`}.`
        : 'No se puede deshacer.';
    return `Vas a eliminar la promoción «${promotion.nombre}». ${effect}`;
  });

  protected isPercentage(promotion: Promotion): boolean {
    return promotion.tipoDescuento === 'PORCENTAJE';
  }

  protected statusOf(promotion: Promotion): PromotionStatus {
    return promotionStatus(promotion, this.today);
  }

  protected statusLabel(promotion: Promotion): string {
    return PROMOTION_STATUS_LABELS[this.statusOf(promotion)];
  }

  protected statusTone(promotion: Promotion): ChipTone {
    return STATUS_TONES[this.statusOf(promotion)];
  }

  protected scopeOf(promotion: Promotion): string {
    return scopeLabel(this.productCounts().get(promotion.id) ?? 0);
  }

  protected vigenciaOf(promotion: Promotion): string {
    return vigenciaLabel(promotion);
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
    this.reload();
  }

  protected reload(): void {
    this.list.reload();
    this.links.reload();
  }

  protected askDelete(promotion: Promotion): void {
    this.deleting.set(promotion);
  }

  protected cancelDelete(): void {
    if (!this.deleteBusy()) this.deleting.set(null);
  }

  /** Si la promoción tiene productos vinculados, se quitan los vínculos antes de borrarla. */
  protected confirmDelete(): void {
    const promotion = this.deleting();
    if (!promotion) return;

    this.deleteBusy.set(true);
    this.service
      .productLinks(promotion.id)
      .pipe(
        switchMap((links) =>
          links.length > 0 ? forkJoin(links.map((link) => this.service.removeLink(link.id))) : of([]),
        ),
        switchMap(() => this.service.remove(promotion.id)),
      )
      .subscribe({
        next: () => {
          this.deleteBusy.set(false);
          this.deleting.set(null);
          this.closeForm();
          this.notifications.success(`Promoción «${promotion.nombre}» eliminada.`);
          this.reload();
        },
        // El errorInterceptor ya avisó del fallo; aquí solo se libera el diálogo.
        error: (error: unknown) => {
          this.deleteBusy.set(false);
          this.deleting.set(null);
          if (asAppError(error).kind === 'validation') {
            this.notifications.error(asAppError(error).message);
          }
          this.reload();
        },
      });
  }
}
