import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { Branch } from '../../../core/models/branch.model';
import { Notifications } from '../../../core/services/notifications';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { BranchService } from '../services/branch.service';

/** Crear y editar una sucursal (POST y PUT /sucursales). Al crearla nace con su Caja 01. */
@Component({
  selector: 'app-branch-form-drawer',
  imports: [ReactiveFormsModule, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      [title]="branch() ? 'Editar sucursal' : 'Nueva sucursal'"
      [subtitle]="
        branch()
          ? branch()!.nombre
          : 'Se crea activa y con su primera caja (Caja 01). Después podés agregar más cajas.'
      "
      (closed)="closed.emit()"
    >
      <form id="branch-form" class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Identificación
          </legend>
          <div>
            <label class="label" for="suc-nombre"><span class="label-text">Nombre</span></label>
            <input
              id="suc-nombre"
              type="text"
              maxlength="100"
              placeholder="Ej. Sucursal Centro"
              formControlName="nombre"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('nombre')"
            />
            @if (errorFor('nombre'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="label" for="suc-codigo"><span class="label-text">Código</span></label>
            <input
              id="suc-codigo"
              type="text"
              maxlength="20"
              placeholder="Ej. CEN"
              formControlName="codigo"
              class="input input-bordered w-full font-mono uppercase sm:max-w-48"
              [class.input-error]="!!errorFor('codigo')"
            />
            @if (errorFor('codigo'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            } @else {
              <p class="mt-1 text-xs text-base-content/50">
                Único por sucursal. Letras, números, guion y guion bajo.
              </p>
            }
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Contacto y horario
          </legend>
          <div>
            <label class="label" for="suc-direccion"><span class="label-text">Dirección</span></label>
            <input
              id="suc-direccion"
              type="text"
              maxlength="255"
              formControlName="direccion"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('direccion')"
            />
            @if (errorFor('direccion'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="label" for="suc-telefono"><span class="label-text">Teléfono</span></label>
            <input
              id="suc-telefono"
              type="tel"
              maxlength="30"
              formControlName="telefono"
              class="input input-bordered w-full sm:max-w-64"
              [class.input-error]="!!errorFor('telefono')"
            />
            @if (errorFor('telefono'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="label" for="suc-horario"><span class="label-text">Horario de atención</span></label>
            <input
              id="suc-horario"
              type="text"
              maxlength="255"
              placeholder="Ej. Lunes a viernes 6:00 a. m. – 7:00 p. m."
              formControlName="horario"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('horario')"
            />
            @if (errorFor('horario'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
        </fieldset>
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="branch-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class BranchFormDrawer {
  private readonly service = inject(BranchService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  /** Sucursal a editar; null para crear una nueva. */
  readonly branch = input<Branch | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Branch>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    codigo: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9_-]+$/)],
    ],
    direccion: ['', [Validators.maxLength(255)]],
    telefono: ['', [Validators.maxLength(30)]],
    horario: ['', [Validators.maxLength(255)]],
  });

  constructor() {
    // Cada vez que se abre, el formulario parte del estado actual de la sucursal.
    effect(() => {
      if (this.open()) {
        const branch = this.branch();
        untracked(() => this.reset(branch));
      }
    });
  }

  protected errorFor(field: string): string | null {
    if (this.form.get(field)?.hasError('pattern') && this.form.get(field)?.touched) {
      return 'Solo letras, números, guion y guion bajo.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const editing = this.branch();
    const draft = {
      nombre: value.nombre.trim(),
      codigo: value.codigo.trim().toUpperCase(),
      direccion: value.direccion.trim() || null,
      telefono: value.telefono.trim() || null,
      horario: value.horario.trim() || null,
    };

    this.saving.set(true);
    this.formError.set(null);
    const request = editing
      ? this.service.update(editing.id, { ...draft, activo: editing.activo })
      : this.service.create(draft);
    request.subscribe({
      next: (branch) => {
        this.saving.set(false);
        this.notifications.success(
          editing ? `"${branch.nombre}" actualizada.` : `"${branch.nombre}" creada con su Caja 01.`,
        );
        this.saved.emit(branch);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        this.formError.set(formLevelMessage(error));
      },
    });
  }

  private reset(branch: Branch | null): void {
    this.formError.set(null);
    this.form.reset({
      nombre: branch?.nombre ?? '',
      codigo: branch?.codigo ?? '',
      direccion: branch?.direccion ?? '',
      telefono: branch?.telefono ?? '',
      horario: branch?.horario ?? '',
    });
  }
}
