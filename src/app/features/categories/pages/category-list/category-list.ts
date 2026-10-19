import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { AppError } from '../../../../core/http/app-error';
import { valueOr } from '../../../../core/http/resource-value';
import { ManagedCategory } from '../../../../core/models/category.model';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import {
  CategoryFilter,
  categoryCounts,
  deactivateMessage,
  filterCategories,
} from '../../category-view';
import { CategoryService } from '../../services/category.service';
import { CategoryDrawer } from '../../ui/category-drawer';

@Component({
  selector: 'app-category-list',
  imports: [PageHeader, ResourceState, StatusChip, Icon, ConfirmDialog, CategoryDrawer],
  templateUrl: './category-list.html',
})
export class CategoryList {
  private readonly service = inject(CategoryService);
  private readonly notifications = inject(Notifications);

  protected readonly crumbs = [{ label: 'Inventario' }, { label: 'Categorías' }];

  protected readonly categories = httpResource<ManagedCategory[]>(
    () => this.service.categoriesUrl(),
    { defaultValue: [] },
  );
  private readonly items = computed(() => valueOr(this.categories, []));

  protected readonly search = signal('');
  protected readonly filter = signal<CategoryFilter>('todas');
  protected readonly drawerOpen = signal(false);
  /** Categoría que se edita; null = el drawer crea una nueva. */
  protected readonly editing = signal<ManagedCategory | null>(null);
  /** Categoría que se quiere desactivar y espera confirmación. */
  protected readonly deactivateTarget = signal<ManagedCategory | null>(null);
  /** Categoría que se quiere reactivar y espera confirmación. */
  protected readonly activateTarget = signal<ManagedCategory | null>(null);
  protected readonly busy = signal(false);

  protected readonly filters: readonly { value: CategoryFilter; label: string }[] = [
    { value: 'todas', label: 'Todas' },
    { value: 'activas', label: 'Activas' },
    { value: 'inactivas', label: 'Inactivas' },
  ];

  protected readonly isEmpty = computed(() => this.items().length === 0);
  protected readonly counts = computed(() => categoryCounts(this.items()));
  protected readonly visible = computed(() =>
    filterCategories(this.items(), this.search(), this.filter()),
  );
  protected readonly deactivateText = computed(() => {
    const target = this.deactivateTarget();
    return target ? deactivateMessage(target) : '';
  });

  protected create(): void {
    this.editing.set(null);
    this.drawerOpen.set(true);
  }

  protected edit(category: ManagedCategory): void {
    this.editing.set(category);
    this.drawerOpen.set(true);
  }

  protected onSaved(): void {
    this.drawerOpen.set(false);
    this.categories.reload();
  }

  protected confirmDeactivate(): void {
    const category = this.deactivateTarget();
    if (!category) return;

    this.busy.set(true);
    this.service.deactivate(category.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.deactivateTarget.set(null);
        this.notifications.success(`Categoría "${category.nombre}" desactivada.`);
        this.categories.reload();
      },
      // El interceptor ya avisa el error.
      error: () => {
        this.busy.set(false);
        this.deactivateTarget.set(null);
      },
    });
  }

  protected confirmActivate(): void {
    const category = this.activateTarget();
    if (!category) return;

    this.busy.set(true);
    this.service.activate(category.id).subscribe({
      next: () => {
        this.busy.set(false);
        this.activateTarget.set(null);
        this.notifications.success(`Categoría "${category.nombre}" reactivada.`);
        this.categories.reload();
      },
      error: (error: AppError) => {
        this.busy.set(false);
        this.activateTarget.set(null);
        if (error.kind === 'validation') {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
