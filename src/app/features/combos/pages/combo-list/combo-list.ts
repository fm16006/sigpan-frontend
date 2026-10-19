import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Router, RouterLink } from '@angular/router';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Combo, ComboLine } from '../../../../core/models/combo.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import {
  availabilityLabel,
  availabilityTone,
  comboAvailability,
  comboSaving,
  comboSum,
  indexProducts,
  lineLabel,
} from '../../combo-summary';
import { ComboFormDrawer } from '../../components/combo-form-drawer/combo-form-drawer';
import { ComboService } from '../../services/combo.service';

export type ComboFilter = 'todos' | 'activos' | 'inactivos';

interface ComboRow {
  readonly combo: Combo;
  readonly contents: readonly string[];
  readonly sum: number;
  readonly saving: number;
  readonly available: number | null;
}

@Component({
  selector: 'app-combo-list',
  imports: [
    RouterLink,
    PageHeader,
    ResourceState,
    StatusChip,
    Icon,
    MoneyPipe,
    ComboFormDrawer,
  ],
  templateUrl: './combo-list.html',
})
export class ComboList {
  private readonly service = inject(ComboService);
  private readonly router = inject(Router);

  protected readonly crumbs = [{ label: 'Inventario' }, { label: 'Combos' }];

  protected readonly combos = httpResource<Combo[]>(() => this.service.combosUrl(), {
    defaultValue: [],
  });
  private readonly lines = httpResource<ComboLine[]>(() => this.service.allLinesUrl(), {
    defaultValue: [],
  });
  private readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });

  // value() lanza si el recurso está en error: se lee solo cuando hay valor.
  private readonly comboItems = computed(() => (this.combos.hasValue() ? this.combos.value() : []));
  private readonly lineItems = computed(() => (this.lines.hasValue() ? this.lines.value() : []));
  private readonly productItems = computed(() => (this.products.hasValue() ? this.products.value() : []));

  protected readonly search = signal('');
  protected readonly filter = signal<ComboFilter>('todos');
  protected readonly drawerOpen = signal(false);

  protected readonly filters: readonly { value: ComboFilter; label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'activos', label: 'Activos' },
    { value: 'inactivos', label: 'Inactivos' },
  ];

  protected readonly isEmpty = computed(() => this.comboItems().length === 0);
  protected readonly loading = computed(
    () => this.combos.isLoading() || this.lines.isLoading() || this.products.isLoading(),
  );
  protected readonly failed = computed(
    () => !!this.combos.error() || !!this.lines.error() || !!this.products.error(),
  );

  private readonly rows = computed<readonly ComboRow[]>(() => {
    const index = indexProducts(this.productItems());
    const byCombo = new Map<number, ComboLine[]>();
    for (const line of this.lineItems()) {
      byCombo.set(line.comboId, [...(byCombo.get(line.comboId) ?? []), line]);
    }

    return this.comboItems().map((combo) => {
      const lines = byCombo.get(combo.id) ?? [];
      const sum = comboSum(lines, index);
      return {
        combo,
        contents: lines.map(lineLabel),
        sum,
        saving: comboSaving(sum, Number(combo.precio)),
        available: comboAvailability(lines, index),
      };
    });
  });

  protected readonly counts = computed(() => {
    const all = this.rows();
    return {
      todos: all.length,
      activos: all.filter((row) => row.combo.activo).length,
      inactivos: all.filter((row) => !row.combo.activo).length,
    } satisfies Record<ComboFilter, number>;
  });

  protected readonly visible = computed(() => {
    const term = this.search().trim().toLowerCase();
    const filter = this.filter();
    return this.rows().filter((row) => {
      if (filter === 'activos' && !row.combo.activo) return false;
      if (filter === 'inactivos' && row.combo.activo) return false;
      if (!term) return true;
      return (
        row.combo.nombre.toLowerCase().includes(term) ||
        row.contents.some((content) => content.toLowerCase().includes(term))
      );
    });
  });

  protected readonly tone = availabilityTone;
  protected readonly label = availabilityLabel;

  protected onSaved(combo: Combo): void {
    this.drawerOpen.set(false);
    // Un combo recién creado no tiene productos: se abre su ficha para agregarlos.
    void this.router.navigate(['/backoffice/combos', combo.id]);
  }
}
