import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AppError } from '../../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../../core/http/form-errors';
import {
  CatalogProduct,
  CatalogProductDraft,
  Category,
  ESPECIALIDAD_LABELS,
  ESPECIALIDADES,
  Especialidad,
  PRODUCT_TYPES,
  PRODUCT_TYPE_LABELS,
  ProductType,
} from '../../../../core/models/catalog.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { describeExemptChange } from '../../../../core/models/tax.model';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { selectableCategories } from '../../../categories/category-view';
import { ProductAdminService } from '../../services/product-admin.service';
import { isChannelOn } from '../../product-channels';
import { createProductForm } from './product-form';

/**
 * Panel lateral para crear y editar un producto. Sin `product` crea; con `product` edita.
 * Se usa desde la lista (Nuevo producto) y desde la ficha (Editar).
 */
@Component({
  selector: 'app-product-drawer',
  imports: [ReactiveFormsModule, RouterLink, FormDrawer, ConfirmDialog],
  templateUrl: './product-drawer.html',
})
export class ProductDrawer {
  private readonly service = inject(ProductAdminService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(Auth);

  readonly open = input(false);
  readonly product = input<CatalogProduct | null>(null);
  readonly closed = output<void>();
  readonly saved = output<CatalogProduct>();

  /** Solo administración cambia precios. */
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  protected readonly productTypes: readonly { value: ProductType; label: string; hint: string }[] =
    PRODUCT_TYPES.map((value) => ({
      value,
      label: PRODUCT_TYPE_LABELS[value],
      hint:
        value === 'ELABORADO'
          ? 'Se produce en la panadería con una receta.'
          : 'Se compra ya hecho a un proveedor. No lleva receta ni órdenes de producción.',
    }));
  protected readonly especialidades = ESPECIALIDADES.map((value) => ({
    value,
    label: ESPECIALIDAD_LABELS[value],
  }));

  protected readonly categories = httpResource<Category[]>(
    () => (this.open() ? this.service.categoriesUrl() : undefined),
    { defaultValue: [] },
  );

  /** Solo categorías activas (y la que el producto ya tiene, aunque se haya desactivado). */
  protected readonly categoryList = computed(() =>
    selectableCategories(
      this.categories.hasValue() ? this.categories.value() : [],
      this.product()?.categoriaId,
    ),
  );

  protected readonly form = createProductForm(this.fb);
  protected readonly newCategory = this.fb.control('', [Validators.required, Validators.minLength(3)]);

  protected readonly saving = signal(false);
  protected readonly savingCategory = signal(false);
  /** Error general del backend, que no pertenece a un campo. */
  protected readonly formError = signal<string | null>(null);
  /** Aviso por confirmar al cambiar «Exento de IVA» en un producto que ya existe. */
  protected readonly exemptNotes = signal<readonly string[] | null>(null);

  constructor() {
    // Cada vez que se abre, el formulario parte del producto (o vacío al crear).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const product = this.product();
      untracked(() => this.prepare(product));
    });
  }

  protected get editing(): boolean {
    return this.product() !== null;
  }

  protected errorFor(field: string): string | null {
    if (field === 'categoriaId' && this.form.controls.categoriaId.hasError('min')) {
      return this.form.controls.categoriaId.touched ? 'Elegí una categoría.' : null;
    }
    if (field === 'stockMinimo' && this.form.controls.stockMinimo.hasError('min')) {
      return this.form.controls.stockMinimo.touched ? 'No puede ser negativo.' : null;
    }
    if (field === 'especialidad' && this.form.controls.especialidad.hasError('required')) {
      return this.form.controls.especialidad.touched ? 'Elegí una especialidad.' : null;
    }
    return firstErrorMessage(this.form, field);
  }

  private exemptConfirmed = false;

  protected confirmExempt(): void {
    this.exemptNotes.set(null);
    this.exemptConfirmed = true;
    this.save();
  }

  protected dismissExempt(): void {
    this.exemptNotes.set(null);
  }

  protected cancel(): void {
    // Con la confirmación abierta, Escape solo cierra la confirmación.
    if (this.exemptNotes()) {
      return;
    }
    this.closed.emit();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const existing = this.product();
    // Cambiar la exención cambia lo que paga el cliente desde la próxima venta: se avisa antes de guardar.
    if (existing !== null && value.exentoIva !== (existing.exentoIva ?? false) && !this.exemptConfirmed) {
      this.exemptNotes.set(describeExemptChange(value.exentoIva));
      return;
    }
    this.exemptConfirmed = false;
    this.saving.set(true);
    this.formError.set(null);
    const draft: CatalogProductDraft = {
      ...value,
      codigo: value.codigo.trim(),
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim(),
      unidadVenta: value.unidadVenta.trim(),
      // El validador de required ya garantiza que hay una opción elegida.
      especialidad: value.especialidad as Especialidad,
      alergenos: value.alergenos.trim() || null,
    };
    const current = this.product();
    const request =
      current === null ? this.service.create(draft) : this.service.update(current.id, draft);

    request.subscribe({
      next: (product) => {
        this.saving.set(false);
        this.notifications.success(
          `Producto "${product.nombre}" ${current === null ? 'creado' : 'actualizado'}.`,
        );
        this.saved.emit(product);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        if (error.kind === 'conflict') {
          if (current !== null && value.tipo !== (current.tipo ?? 'ELABORADO')) {
            // 409 al cambiar el tipo: el producto ya tiene receta u órdenes de producción.
            this.formError.set(error.message);
            return;
          }
          // 409: el código ya lo usa otro producto. Se muestra junto al campo.
          this.form.controls.codigo.setErrors({ server: error.message });
          this.form.controls.codigo.markAsTouched();
          return;
        }
        applyFieldErrors(this.form, error);
        this.formError.set(formLevelMessage(error));
      },
    });
  }

  protected createCategory(): void {
    if (this.newCategory.invalid) {
      this.newCategory.markAsTouched();
      return;
    }

    this.savingCategory.set(true);
    this.service.createCategory(this.newCategory.value.trim()).subscribe({
      next: (category) => {
        this.savingCategory.set(false);
        this.newCategory.reset();
        this.categories.reload();
        this.form.controls.categoriaId.setValue(category.id);
      },
      error: () => this.savingCategory.set(false),
    });
  }

  private prepare(product: CatalogProduct | null): void {
    this.formError.set(null);
    this.saving.set(false);
    this.newCategory.reset();
    this.form.reset();
    if (product) {
      this.form.setValue({
        codigo: product.codigo,
        nombre: product.nombre,
        descripcion: product.descripcion ?? '',
        precio: Number(product.precio),
        categoriaId: product.categoriaId,
        stockMinimo: Number(product.stockMinimo ?? 0),
        unidadVenta: product.unidadVenta,
        tipo: product.tipo ?? 'ELABORADO',
        especialidad: product.especialidad,
        alergenos: product.alergenos ?? '',
        disponiblePos: isChannelOn(product, 'disponiblePos'),
        disponibleTienda: isChannelOn(product, 'disponibleTienda'),
        exentoIva: product.exentoIva ?? false,
      });
    }
    if (this.isAdmin) {
      this.form.controls.precio.enable();
    } else {
      this.form.controls.precio.disable();
    }
  }
}
