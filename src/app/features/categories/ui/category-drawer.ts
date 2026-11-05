import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { ManagedCategory } from '../../../core/models/category.model';
import { Notifications } from '../../../core/services/notifications';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { CategoryService } from '../services/category.service';

/** Panel lateral para crear y editar una categoría. Sin `category` crea; con `category` edita. */
@Component({
  selector: 'app-category-drawer',
  imports: [ReactiveFormsModule, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      [title]="category() ? 'Editar categoría' : 'Nueva categoría'"
      [subtitle]="
        category()
          ? category()!.nombre
          : 'Agrupa productos y combos en el punto de venta y en la tienda.'
      "
      (closed)="closed.emit()"
    >
      @if (formError(); as message) {
        <div role="alert" class="alert alert-error mb-4 py-2 text-sm">{{ message }}</div>
      }
      <form id="category-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="save()">
        <div>
          <label class="mb-1.5 block text-sm font-semibold" for="cat-nombre">Nombre</label>
          <input
            id="cat-nombre"
            type="text"
            maxlength="100"
            placeholder="Ej. Promociones"
            formControlName="nombre"
            class="input input-bordered w-full"
            [class.input-error]="!!errorFor('nombre')"
          />
          @if (errorFor('nombre'); as message) {
            <p class="mt-1 text-xs text-error">{{ message }}</p>
          }
        </div>
        <div>
          <label class="mb-1.5 block text-sm font-semibold" for="cat-descripcion">
            Descripción (opcional)
          </label>
          <textarea
            id="cat-descripcion"
            rows="3"
            maxlength="255"
            formControlName="descripcion"
            class="textarea textarea-bordered w-full"
          ></textarea>
          @if (errorFor('descripcion'); as message) {
            <p class="mt-1 text-xs text-error">{{ message }}</p>
          }
        </div>
      </form>
      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="category-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class CategoryDrawer {
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly service = inject(CategoryService);
  private readonly notifications = inject(Notifications);

  readonly open = input(false);
  /** Categoría a editar; null = alta. */
  readonly category = input<ManagedCategory | null>(null);
  readonly closed = output<void>();
  readonly saved = output<ManagedCategory>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    descripcion: ['', [Validators.maxLength(255)]],
  });

  constructor() {
    // Cada vez que se abre, el formulario parte de la categoría (o en blanco al crear).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const category = this.category();
      untracked(() => {
        this.formError.set(null);
        this.saving.set(false);
        this.form.reset({
          nombre: category?.nombre ?? '',
          descripcion: category?.descripcion ?? '',
        });
      });
    });
  }

  protected errorFor(field: 'nombre' | 'descripcion'): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    this.formError.set(null);
    const nombre = this.form.controls.nombre.value.trim();
    // Un nombre de solo espacios cuenta como vacío.
    this.form.controls.nombre.setValue(nombre);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const draft = {
      nombre,
      descripcion: this.form.controls.descripcion.value.trim() || null,
    };
    const current = this.category();

    this.saving.set(true);
    const request = current ? this.service.update(current.id, draft) : this.service.create(draft);
    request.subscribe({
      next: (category) => {
        this.saving.set(false);
        this.notifications.success(
          current
            ? `Categoría "${category.nombre}" actualizada.`
            : `Categoría "${category.nombre}" creada.`,
        );
        this.saved.emit(category);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        if (error.kind === 'conflict') {
          // Nombre repetido: el error va en el campo, que es donde se corrige.
          this.form.controls.nombre.markAsTouched();
          this.form.controls.nombre.setErrors({ server: error.message });
          return;
        }
        this.formError.set(formLevelMessage(error));
      },
    });
  }
}
