import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { Id } from '../../../../core/models/api.model';
import {
  CatalogProduct,
  Category,
  IMAGE_TYPES,
  MAX_IMAGE_MB,
} from '../../../../core/models/catalog.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ProductAdminService } from '../../services/product-admin.service';

@Component({
  selector: 'app-product-admin',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, MoneyPipe],
  templateUrl: './product-admin.html',
})
export class ProductAdmin {
  private readonly service = inject(ProductAdminService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  private readonly auth = inject(Auth);

  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  protected readonly canEdit = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);
  protected readonly maxImageMb = MAX_IMAGE_MB;
  protected readonly acceptedTypes = IMAGE_TYPES.join(',');

  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  protected readonly categories = httpResource<Category[]>(() => this.service.categoriesUrl(), {
    defaultValue: [],
  });
  protected readonly items = computed(() =>
    [...this.products.value()].sort((a, b) => b.id - a.id),
  );

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
  });
  protected readonly newCategory = this.fb.control('', [Validators.required, Validators.minLength(3)]);

  protected readonly showForm = signal(false);
  protected readonly editingId = signal<Id | null>(null);
  protected readonly saving = signal(false);
  protected readonly savingCategory = signal(false);
  protected readonly busyId = signal<Id | null>(null);
  protected readonly confirmDeleteId = signal<Id | null>(null);

  protected errorFor(field: string): string | null {
    if (field === 'categoriaId' && this.form.controls.categoriaId.hasError('min')) {
      return this.form.controls.categoriaId.touched ? 'Elegí una categoría.' : null;
    }
    return firstErrorMessage(this.form, field);
  }

  protected toggleForm(): void {
    if (this.showForm()) {
      this.closeForm();
      return;
    }
    this.editingId.set(null);
    this.form.reset();
    this.form.controls.precio.enable();
    this.showForm.set(true);
  }

  protected startEdit(product: CatalogProduct): void {
    this.editingId.set(product.id);
    this.form.setValue({
      nombre: product.nombre,
      descripcion: product.descripcion ?? '',
      precio: Number(product.precio),
      categoriaId: product.categoriaId,
    });
    if (this.isAdmin) {
      this.form.controls.precio.enable();
    } else {
      this.form.controls.precio.disable();
    }
    this.showForm.set(true);
  }

  protected closeForm(): void {
    this.showForm.set(false);
    this.editingId.set(null);
    this.form.reset();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const value = this.form.getRawValue();
    const draft = { ...value, nombre: value.nombre.trim(), descripcion: value.descripcion.trim() };
    const id = this.editingId();
    const request = id === null ? this.service.create(draft) : this.service.update(id, draft);

    request.subscribe({
        next: (product) => {
          this.saving.set(false);
          this.closeForm();
          this.notifications.success(
            `Producto "${product.nombre}" ${id === null ? 'creado' : 'actualizado'}.`,
          );
          this.products.reload();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          applyFieldErrors(this.form, error);
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

  protected uploadImage(product: CatalogProduct, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';

    if (!file) {
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      this.notifications.error('Formato no permitido. Usá JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      this.notifications.error(`La imagen supera ${MAX_IMAGE_MB} MB.`);
      return;
    }

    this.busyId.set(product.id);
    this.service.uploadImage(product.id, file).subscribe({
      next: () => this.done('Imagen actualizada.'),
      error: () => this.busyId.set(null),
    });
  }

  protected removeImage(product: CatalogProduct): void {
    this.busyId.set(product.id);
    this.service.removeImage(product.id).subscribe({
      next: () => this.done('Imagen eliminada.'),
      error: () => this.busyId.set(null),
    });
  }

  protected remove(product: CatalogProduct): void {
    if (this.confirmDeleteId() !== product.id) {
      this.confirmDeleteId.set(product.id);
      return;
    }

    this.confirmDeleteId.set(null);
    this.busyId.set(product.id);

    const deleteProduct = () =>
      this.service.remove(product.id).subscribe({
        next: () => this.done(`Producto "${product.nombre}" eliminado.`),
        error: () => this.busyId.set(null),
      });

    if (product.imagenUrl) {
      this.service.removeImage(product.id).subscribe({
        next: deleteProduct,
        error: () => this.busyId.set(null),
      });
    } else {
      deleteProduct();
    }
  }

  private done(message: string): void {
    this.busyId.set(null);
    this.notifications.success(message);
    this.products.reload();
  }
}
