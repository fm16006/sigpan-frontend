import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { asAppError } from '../../../../core/http/as-app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Id } from '../../../../core/models/api.model';
import { ManagedCategory } from '../../../../core/models/category.model';
import {
  PROMOTION_SCOPES,
  PROMOTION_SCOPE_HINTS,
  PROMOTION_SCOPE_LABELS,
  PROMOTION_TYPES,
  PROMOTION_TYPE_LABELS,
  Promotion,
  PromotionDraft,
  PromotionScope,
  PromotionType,
} from '../../../../core/models/promotion.model';
import { ApiClient } from '../../../../core/http/api-client';
import { Notifications } from '../../../../core/services/notifications';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import {
  addToSelection,
  countVisibleSelected,
  filterProducts,
  fullMonthOf,
  scopeOf,
} from '../../promotion-utils';
import { PromotionService } from '../../services/promotion.service';
import { valueOr } from '../../../../core/http/resource-value';

type Vigencia = 'RANGO' | 'MES';

/** Campos del backend que se muestran junto a su selector y no arriba del formulario. */
const SCOPE_FIELDS: readonly string[] = ['categoriaIds', 'productoIds'];

/**
 * Alta y edición de una promoción, con su alcance (todos los productos, categorías o productos elegidos),
 * dentro de un drawer. Los errores del backend se muestran junto al campo o arriba. Eliminar lo confirma
 * quien aloja el componente.
 */
@Component({
  selector: 'app-promotion-form',
  imports: [ReactiveFormsModule, FormDrawer],
  templateUrl: './promotion-form.html',
})
export class PromotionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PromotionService);
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);

  /** Promoción a editar; null para crear. */
  readonly promotion = input<Promotion | null>(null);
  readonly saved = output<Promotion>();
  readonly cancelled = output<void>();
  /** El usuario pidió eliminar la promoción en edición; quien la aloja pide la confirmación. */
  readonly removeRequested = output<Promotion>();

  protected readonly types = PROMOTION_TYPES;
  protected readonly typeLabels = PROMOTION_TYPE_LABELS;
  protected readonly scopes = PROMOTION_SCOPES;
  protected readonly scopeLabels = PROMOTION_SCOPE_LABELS;
  protected readonly scopeHints = PROMOTION_SCOPE_HINTS;

  protected readonly products = httpResource<CatalogProduct[]>(
    () => this.api.url(API_ENDPOINTS.productos.root),
    { defaultValue: [] },
  );
  protected readonly categories = httpResource<ManagedCategory[]>(
    () => this.api.url(API_ENDPOINTS.categorias.root),
    { defaultValue: [] },
  );

  /** Solo productos activos: los desactivados no se ofrecen. */
  protected readonly activeProducts = computed(() =>
    valueOr(this.products, []).filter((product) => product.activo),
  );
  /** Solo categorías activas. */
  protected readonly activeCategories = computed(() =>
    valueOr(this.categories, []).filter((category) => category.activo),
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    tipoDescuento: this.fb.nonNullable.control<PromotionType>('PORCENTAJE', Validators.required),
    valorDescuento: [0, [Validators.required, Validators.min(0)]],
    vigencia: this.fb.nonNullable.control<Vigencia>('RANGO'),
    mes: [''],
    fechaInicio: [''],
    fechaFin: [''],
    prioridad: [0, [Validators.required, Validators.min(0)]],
  });

  /** Alcance elegido. */
  protected readonly scope = signal<PromotionScope>('PRODUCTOS');

  /** Ids de productos marcados (puede incluir alguno ya desactivado que la promoción conservaba). */
  protected readonly selectedIds = signal<ReadonlySet<Id>>(new Set());
  protected readonly selectedCategoryIds = signal<ReadonlySet<Id>>(new Set());

  /** Texto del buscador de productos. */
  protected readonly term = signal('');
  protected readonly filteredProducts = computed(() => filterProducts(this.activeProducts(), this.term()));
  /** Seleccionados que se ven en la lista (los desactivados no se cuentan ni se ofrecen). */
  protected readonly selectedCount = computed(() =>
    countVisibleSelected(this.selectedIds(), this.activeProducts()),
  );
  protected readonly selectedCategoryCount = computed(() =>
    countVisibleSelected(this.selectedCategoryIds(), this.activeCategories()),
  );

  protected readonly productsError = signal<string | null>(null);
  protected readonly categoriesError = signal<string | null>(null);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.promotion() !== null);

  ngOnInit(): void {
    // Los inputs ya tienen valor aquí (no en el constructor): datos de la promoción y su alcance.
    const current = this.promotion();
    if (current) {
      // Un mes calendario completo se edita como "Mes completo": el backend guarda solo las fechas.
      const mes = fullMonthOf(current.fechaInicio, current.fechaFin);
      this.form.patchValue({
        nombre: current.nombre,
        descripcion: current.descripcion ?? '',
        tipoDescuento: current.tipoDescuento,
        valorDescuento: current.valorDescuento,
        prioridad: current.prioridad ?? 0,
        vigencia: mes ? 'MES' : 'RANGO',
        mes: mes ?? '',
        fechaInicio: mes ? '' : (current.fechaInicio ?? ''),
        fechaFin: mes ? '' : (current.fechaFin ?? ''),
      });
      this.scope.set(scopeOf(current));
      this.selectedIds.set(new Set(current.productoIds ?? []));
      this.selectedCategoryIds.set(new Set(current.categoriaIds ?? []));
    }
  }

  protected chooseScope(scope: PromotionScope): void {
    this.scope.set(scope);
    this.productsError.set(null);
    this.categoriesError.set(null);
  }

  protected isSelected(productId: Id): boolean {
    return this.selectedIds().has(productId);
  }

  protected toggleProduct(productId: Id, checked: boolean): void {
    this.selectedIds.set(toggled(this.selectedIds(), productId, checked));
    this.productsError.set(null);
  }

  /** Marca todos los productos que muestra el buscador en este momento. */
  protected selectFiltered(): void {
    this.selectedIds.set(addToSelection(this.selectedIds(), this.filteredProducts().map((p) => p.id)));
    this.productsError.set(null);
  }

  protected clearProducts(): void {
    this.selectedIds.set(new Set());
  }

  protected isCategorySelected(categoryId: Id): boolean {
    return this.selectedCategoryIds().has(categoryId);
  }

  protected toggleCategory(categoryId: Id, checked: boolean): void {
    this.selectedCategoryIds.set(toggled(this.selectedCategoryIds(), categoryId, checked));
    this.categoriesError.set(null);
  }

  protected setTerm(value: string): void {
    this.term.set(value);
  }

  protected fieldError(field: string): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const mes = this.form.controls.mes;
    if (this.form.controls.vigencia.value === 'MES' && !mes.value) {
      mes.markAsTouched();
      mes.setErrors({ required: true });
      return;
    }
    if (this.scope() === 'PRODUCTOS' && this.selectedCount() === 0) {
      this.productsError.set('Elegí al menos un producto activo.');
      return;
    }
    if (this.scope() === 'CATEGORIAS' && this.selectedCategoryCount() === 0) {
      this.categoriesError.set('Elegí al menos una categoría activa.');
      return;
    }

    const draft = this.draft();
    this.saving.set(true);

    const current = this.promotion();
    const request = current ? this.service.update(current.id, draft) : this.service.create(draft);

    request.subscribe({
      next: (promotion) => {
        this.saving.set(false);
        this.notifications.success(current ? 'Promoción actualizada.' : 'Promoción creada.');
        this.saved.emit(promotion);
      },
      error: (error: unknown) => this.onError(error),
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  protected requestRemove(): void {
    const current = this.promotion();
    if (current) this.removeRequested.emit(current);
  }

  /** Cuerpo de alta/edición. Solo viaja la lista que corresponde al alcance elegido. */
  protected draft(): PromotionDraft {
    const raw = this.form.getRawValue();
    const porMes = raw.vigencia === 'MES';
    return {
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() || null,
      tipoDescuento: raw.tipoDescuento,
      valorDescuento: Number(raw.valorDescuento),
      mes: porMes ? raw.mes || null : null,
      fechaInicio: porMes ? null : raw.fechaInicio || null,
      fechaFin: porMes ? null : raw.fechaFin || null,
      prioridad: Number(raw.prioridad),
      alcance: this.scope(),
      categoriaIds: this.scope() === 'CATEGORIAS' ? [...this.selectedCategoryIds()] : [],
      productoIds: this.scope() === 'PRODUCTOS' ? [...this.selectedIds()] : [],
    };
  }

  private onError(error: unknown): void {
    this.saving.set(false);
    const appError = asAppError(error);
    applyFieldErrors(this.form, appError);
    this.productsError.set(appError.fieldErrors['productoIds'] ?? null);
    this.categoriesError.set(appError.fieldErrors['categoriaIds'] ?? null);

    // Errores de nivel de objeto (p. ej. rango de fechas) no pertenecen a un control: van arriba.
    const generales = Object.entries(appError.fieldErrors)
      .filter(([field]) => !this.form.get(field) && !SCOPE_FIELDS.includes(field))
      .map(([, message]) => message);
    if (generales.length > 0) {
      this.formError.set(generales.join(' '));
    } else if (Object.keys(appError.fieldErrors).length === 0) {
      this.formError.set(appError.message);
    }
  }
}

function toggled(selection: ReadonlySet<Id>, id: Id, checked: boolean): ReadonlySet<Id> {
  const next = new Set(selection);
  if (checked) {
    next.add(id);
  } else {
    next.delete(id);
  }
  return next;
}
