import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { Id } from '../../../core/models/api.model';
import { Register } from '../../../core/models/branch.model';
import { Notifications } from '../../../core/services/notifications';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { BranchService } from '../services/branch.service';

/** Crear y editar una caja de la sucursal. Nombre y código son únicos dentro de la sucursal. */
@Component({
  selector: 'app-register-form-drawer',
  imports: [ReactiveFormsModule, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      [title]="register() ? 'Editar caja' : 'Nueva caja'"
      [subtitle]="register() ? register()!.nombre : 'Queda activa y disponible para abrir el punto de venta.'"
      (closed)="closed.emit()"
    >
      <form id="register-form" class="flex flex-col gap-4" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }
        <div>
          <label class="label" for="caja-nombre"><span class="label-text">Nombre</span></label>
          <input
            id="caja-nombre"
            type="text"
            maxlength="100"
            placeholder="Ej. Caja 02"
            formControlName="nombre"
            class="input input-bordered w-full"
            [class.input-error]="!!errorFor('nombre')"
          />
          @if (errorFor('nombre'); as message) {
            <p class="mt-1 text-xs text-error">{{ message }}</p>
          }
        </div>
        <div>
          <label class="label" for="caja-codigo"><span class="label-text">Código</span></label>
          <input
            id="caja-codigo"
            type="text"
            maxlength="20"
            placeholder="Ej. C02"
            formControlName="codigo"
            class="input input-bordered w-full font-mono uppercase sm:max-w-48"
            [class.input-error]="!!errorFor('codigo')"
          />
          @if (errorFor('codigo'); as message) {
            <p class="mt-1 text-xs text-error">{{ message }}</p>
          } @else {
            <p class="mt-1 text-xs text-base-content/50">Único dentro de la sucursal.</p>
          }
        </div>
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="register-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class RegisterFormDrawer {
  private readonly service = inject(BranchService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  readonly branchId = input.required<Id>();
  /** Caja a editar; null para crear una nueva. */
  readonly register = input<Register | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Register>();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(100)]],
    codigo: [
      '',
      [Validators.required, Validators.minLength(2), Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9_-]+$/)],
    ],
  });

  constructor() {
    effect(() => {
      if (this.open()) {
        const register = this.register();
        untracked(() => this.reset(register));
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
    const editing = this.register();
    const draft = { nombre: value.nombre.trim(), codigo: value.codigo.trim().toUpperCase() };

    this.saving.set(true);
    this.formError.set(null);
    const request = editing
      ? this.service.updateRegister(this.branchId(), editing.id, { ...draft, activo: editing.activo })
      : this.service.createRegister(this.branchId(), draft);
    request.subscribe({
      next: (register) => {
        this.saving.set(false);
        this.notifications.success(
          editing ? `"${register.nombre}" actualizada.` : `"${register.nombre}" creada.`,
        );
        this.saved.emit(register);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        this.formError.set(formLevelMessage(error));
      },
    });
  }

  private reset(register: Register | null): void {
    this.formError.set(null);
    this.form.reset({ nombre: register?.nombre ?? '', codigo: register?.codigo ?? '' });
  }
}
