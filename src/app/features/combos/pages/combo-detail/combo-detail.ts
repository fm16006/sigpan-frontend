import { Component, computed, inject, input, signal } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { AppError } from '../../../../core/http/app-error';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Combo, ComboLine } from '../../../../core/models/combo.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DetailHeader } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import {
  availabilityLabel,
  availabilityTone,
  comboAvailability,
  comboSaving,
  comboSum,
  indexProducts,
  lineAvailability,
  savingPercent,
} from '../../combo-summary';
import { ComboFormDrawer } from '../../components/combo-form-drawer/combo-form-drawer';
import { ComboLineDrawer } from '../../components/combo-line-drawer/combo-line-drawer';
import { ComboService } from '../../services/combo.service';

interface LineRow {
  readonly line: ComboLine;
  readonly product: CatalogProduct | undefined;
  readonly unitPrice: number;
  readonly subtotal: number;
  readonly reaches: number;
  /** Es el producto que limita cuántos combos se pueden armar. */
  readonly limiting: boolean;
}

@Component({
  selector: 'app-combo-detail',
  imports: [
    RouterLink,
    DecimalPipe,
    DetailHeader,
    ResourceState,
    StatCard,
    StatusChip,
    ConfirmDialog,
    Icon,
    MoneyPipe,
    ComboFormDrawer,
    ComboLineDrawer,
  ],
  templateUrl: './combo-detail.html',
})
export class ComboDetail {
  private readonly service = inject(ComboService);
  private readonly router = inject(Router);
  private readonly notifications = inject(Notifications);

  /** Parámetro `:id` de la ruta. */
  readonly id = input.required<string>();

  protected readonly combo = httpResource<Combo>(() => this.service.comboUrl(Number(this.id())));
  protected readonly lines = httpResource<ComboLine[]>(
    () => this.service.linesUrl(Number(this.id())),
    { defaultValue: [] },
  );
  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });

  // value() lanza si el recurso está en error: se lee solo cuando hay valor.
  protected readonly current = computed(() => (this.combo.hasValue() ? this.combo.value() : undefined));
  protected readonly lineItems = computed(() => (this.lines.hasValue() ? this.lines.value() : []));
  protected readonly productItems = computed(() => (this.products.hasValue() ? this.products.value() : []));

  protected readonly editOpen = signal(false);
  protected readonly lineOpen = signal(false);
  protected readonly deleteOpen = signal(false);
  protected readonly removeTarget = signal<ComboLine | null>(null);
  protected readonly busy = signal(false);

  protected readonly index = computed(() => indexProducts(this.productItems()));
  protected readonly sum = computed(() => comboSum(this.lineItems(), this.index()));
  protected readonly available = computed(() => comboAvailability(this.lineItems(), this.index()));
  protected readonly saving = computed(() =>
    comboSaving(this.sum(), Number(this.current()?.precio ?? 0)),
  );
  protected readonly savingPct = computed(() =>
    savingPercent(this.sum(), Number(this.current()?.precio ?? 0)),
  );

  protected readonly rows = computed<readonly LineRow[]>(() => {
    const index = this.index();
    const lines = this.lineItems();
    const min = this.available();
    return lines.map((line) => {
      const product = index.get(line.productoId);
      const unitPrice = Number(product?.precio ?? 0);
      const reaches = lineAvailability(line, index);
      return {
        line,
        product,
        unitPrice,
        subtotal: unitPrice * Number(line.cantidad),
        reaches,
        limiting: lines.length > 1 && reaches === min,
      };
    });
  });

  /** Producto que limita la disponibilidad, para explicarlo en el panel. */
  protected readonly limitingName = computed(
    () => this.rows().find((row) => row.limiting)?.line.producto ?? null,
  );

  protected readonly crumbs = computed(() => [
    { label: 'Inventario' },
    { label: 'Combos', link: '/backoffice/combos' },
    { label: this.current()?.nombre ?? '' },
  ]);

  protected readonly tone = availabilityTone;
  protected readonly label = availabilityLabel;

  protected reloadAll(): void {
    this.combo.reload();
    this.lines.reload();
    this.products.reload();
  }

  protected onEdited(): void {
    this.editOpen.set(false);
    this.combo.reload();
  }

  protected onLineAdded(): void {
    this.lineOpen.set(false);
    this.lines.reload();
  }

  protected confirmRemoveLine(): void {
    const line = this.removeTarget();
    if (!line) return;

    this.busy.set(true);
    this.service.removeLine(line.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.removeTarget.set(null);
        this.notifications.success(`"${line.producto}" quitado del combo.`);
        this.lines.reload();
      },
      error: (error: AppError) => {
        this.busy.set(false);
        this.removeTarget.set(null);
        // Los demás errores ya los avisa el interceptor.
        if (error.kind === 'validation') {
          this.notifications.error(error.message);
        }
      },
    });
  }

  protected confirmDelete(): void {
    const combo = this.current();
    if (!combo) return;

    this.busy.set(true);
    this.service.remove(combo.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deleteOpen.set(false);
        this.notifications.success(`Combo "${combo.nombre}" eliminado.`);
        void this.router.navigate(['/backoffice/combos']);
      },
      // El error ya se avisa desde el interceptor.
      error: () => {
        this.busy.set(false);
        this.deleteOpen.set(false);
      },
    });
  }

  protected productLink(productoId: Id): string[] {
    return ['/backoffice/products', String(productoId)];
  }
}
