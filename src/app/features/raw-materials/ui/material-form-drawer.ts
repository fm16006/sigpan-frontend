import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { RawMaterial } from '../../../core/models/production.model';
import { Notifications } from '../../../core/services/notifications';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { InventoryService } from '../services/inventory.service';

const UNIDADES_COMUNES = ['kg', 'g', 'lb', 'l', 'ml', 'u'] as const;

/** Crear y editar una materia prima (POST y PUT /materias-primas). */
@Component({
  selector: 'app-material-form-drawer',
  imports: [ReactiveFormsModule, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      [title]="material() ? 'Editar materia prima' : 'Nueva materia prima'"
      [subtitle]="
        material()
          ? material()!.nombre
          : 'Se crea con su inventario en cero. Registrá la primera compra desde su ficha.'
      "
      (closed)="closed.emit()"
    >
      <form id="material-form" class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Identificación
          </legend>
          <div>
            <label class="label" for="mp-nombre"><span class="label-text">Nombre</span></label>
            <input
              id="mp-nombre"
              type="text"
              maxlength="150"
              placeholder="Ej. Harina de trigo"
              formControlName="nombre"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('nombre')"
            />
            @if (errorFor('nombre'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="label" for="mp-descripcion"><span class="label-text">Descripción</span></label>
            <input
              id="mp-descripcion"
              type="text"
              placeholder="Ej. Harina fuerte para pan francés"
              formControlName="descripcion"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('descripcion')"
            />
            @if (errorFor('descripcion'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Medida y reposición
          </legend>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="mp-unidad"><span class="label-text">Unidad base</span></label>
              <input
                id="mp-unidad"
                type="text"
                maxlength="20"
                list="mp-unidades"
                placeholder="kg, l, u…"
                formControlName="unidadMedida"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('unidadMedida')"
              />
              <datalist id="mp-unidades">
                @for (unidad of unidades; track unidad) {
                  <option [value]="unidad"></option>
                }
              </datalist>
              @if (errorFor('unidadMedida'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
            <div>
              <label class="label" for="mp-minimo"><span class="label-text">Existencia mínima</span></label>
              <input
                id="mp-minimo"
                type="number"
                step="0.001"
                min="0"
                formControlName="stockMinimo"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('stockMinimo')"
              />
              @if (errorFor('stockMinimo'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              } @else {
                <p class="mt-1 text-xs text-base-content/50">Por debajo de esto se marca “Reabastecer”.</p>
              }
            </div>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="mp-reorden"><span class="label-text">Punto de reorden</span></label>
              <input id="mp-reorden" type="number" step="0.001" min="0" formControlName="puntoReorden" class="input input-bordered w-full" />
              <p class="mt-1 text-xs text-base-content/50">Al llegar aquí aparece la alerta de compra.</p>
            </div>
            <div>
              <label class="label" for="mp-cant-reorden"><span class="label-text">Cantidad a pedir (opcional)</span></label>
              <input id="mp-cant-reorden" type="number" step="0.001" min="0" formControlName="cantidadReorden" class="input input-bordered w-full" />
              <p class="mt-1 text-xs text-base-content/50">Vacío: se sugiere según el punto de reorden.</p>
            </div>
          </div>
          <div>
            <label class="label" for="mp-precio"><span class="label-text">Precio de referencia (opcional)</span></label>
            <input
              id="mp-precio"
              type="number"
              step="0.01"
              min="0"
              formControlName="precio"
              class="input input-bordered w-full sm:max-w-48"
              [class.input-error]="!!errorFor('precio')"
            />
            @if (errorFor('precio'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            } @else {
              <p class="mt-1 text-xs text-base-content/50">
                Se usa como costo mientras no haya compras registradas.
              </p>
            }
          </div>
        </fieldset>
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="material-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class MaterialFormDrawer {
  private readonly service = inject(InventoryService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  /** Materia prima a editar; null para crear una nueva. */
  readonly material = input<RawMaterial | null>(null);
  readonly closed = output<void>();
  readonly saved = output<RawMaterial>();

  protected readonly unidades = UNIDADES_COMUNES;
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    unidadMedida: ['', [Validators.required, Validators.maxLength(20)]],
    precio: [0, [Validators.min(0)]],
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    puntoReorden: [0, [Validators.min(0)]],
    cantidadReorden: [null as number | null, [Validators.min(0)]],
  });

  constructor() {
    // Cada vez que se abre, el formulario parte del estado actual de la materia prima.
    effect(() => {
      if (this.open()) {
        const material = this.material();
        untracked(() => this.reset(material));
      }
    });
  }

  protected errorFor(field: string): string | null {
    const control = this.form.get(field);
    if (control?.hasError('min') && control.touched) {
      return 'No puede ser negativo.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const draft = {
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim(),
      unidadMedida: value.unidadMedida.trim(),
      precio: Number(value.precio ?? 0),
      stockMinimo: Number(value.stockMinimo),
      puntoReorden: Number(value.puntoReorden ?? 0),
      cantidadReorden: value.cantidadReorden ? Number(value.cantidadReorden) : null,
    };
    const editing = this.material();

    this.saving.set(true);
    this.formError.set(null);
    const request = editing
      ? this.service.updateMaterial(editing.id, draft)
      : this.service.createMaterial(draft);
    request.subscribe({
      next: (material) => {
        this.saving.set(false);
        this.notifications.success(
          editing
            ? `"${material.nombre}" actualizada.`
            : `"${material.nombre}" creada. Registrá su primera compra para darle existencia.`,
        );
        this.saved.emit(material);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        this.formError.set(formLevelMessage(error));
      },
    });
  }

  private reset(material: RawMaterial | null): void {
    this.formError.set(null);
    this.form.reset({
      nombre: material?.nombre ?? '',
      descripcion: material?.descripcion ?? '',
      unidadMedida: material?.unidadMedida ?? '',
      precio: Number(material?.precio ?? 0),
      stockMinimo: Number(material?.stockMinimo ?? 0),
      puntoReorden: Number(material?.puntoReorden ?? 0),
      cantidadReorden: material?.cantidadReorden ?? null,
    });
  }
}
