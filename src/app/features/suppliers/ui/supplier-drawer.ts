import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { Supplier, SupplierDraft } from '../../../core/models/purchase.model';
import { Notifications } from '../../../core/services/notifications';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { SupplierService } from '../services/supplier.service';
import { createSupplierForm } from './supplier-form';

/** Panel lateral para crear y editar un proveedor. Sin `supplier` crea; con `supplier` edita. */
@Component({
  selector: 'app-supplier-drawer',
  imports: [ReactiveFormsModule, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      [title]="supplier() ? 'Editar proveedor' : 'Nuevo proveedor'"
      [subtitle]="supplier() ? supplier()!.nombre : 'Quién te vende y cómo contactarlo.'"
      (closed)="closed.emit()"
    >
      @if (formError(); as message) {
        <div role="alert" class="alert alert-error mb-4 py-2 text-sm">{{ message }}</div>
      }
      <form id="supplier-form" class="flex flex-col gap-5" [formGroup]="form" (ngSubmit)="save()">
        <fieldset class="flex flex-col gap-3">
          <legend class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Proveedor
          </legend>
          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="sp-nombre">Nombre o razón social</label>
            <input
              id="sp-nombre"
              type="text"
              maxlength="150"
              formControlName="nombre"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('nombre')"
            />
            @if (errorFor('nombre'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="sp-nit">NIT (opcional)</label>
            <input
              id="sp-nit"
              type="text"
              maxlength="30"
              placeholder="0614-010190-101-2"
              formControlName="nit"
              class="input input-bordered w-full font-mono text-sm"
              [class.input-error]="!!errorFor('nit')"
            />
            @if (errorFor('nit'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            } @else {
              <p class="mt-1 text-xs text-base-content/55">Si lo indicás, no puede repetirse en otro proveedor.</p>
            }
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-3">
          <legend class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Contacto
          </legend>
          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="sp-contacto">Persona de contacto</label>
            <input
              id="sp-contacto"
              type="text"
              maxlength="150"
              formControlName="contacto"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('contacto')"
            />
            @if (errorFor('contacto'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-semibold" for="sp-telefono">Teléfono</label>
              <input
                id="sp-telefono"
                type="tel"
                maxlength="30"
                inputmode="tel"
                formControlName="telefono"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('telefono')"
              />
              @if (errorFor('telefono'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold" for="sp-email">Correo</label>
              <input
                id="sp-email"
                type="email"
                maxlength="150"
                formControlName="email"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('email')"
              />
              @if (errorFor('email'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
          </div>
        </fieldset>
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="supplier-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class SupplierDrawer {
  private readonly service = inject(SupplierService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  /** Proveedor a editar; null = alta. */
  readonly supplier = input<Supplier | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Supplier>();

  protected readonly form = createSupplierForm(this.fb);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    // Cada vez que se abre, el formulario parte del proveedor (o vacío al crear).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const supplier = this.supplier();
      untracked(() => {
        this.formError.set(null);
        this.saving.set(false);
        this.form.reset({
          nombre: supplier?.nombre ?? '',
          contacto: supplier?.contacto ?? '',
          telefono: supplier?.telefono ?? '',
          email: supplier?.email ?? '',
          nit: supplier?.nit ?? '',
        });
      });
    });
  }

  protected errorFor(field: string): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    const draft: SupplierDraft = {
      nombre: value.nombre.trim(),
      contacto: value.contacto.trim(),
      telefono: value.telefono.trim(),
      email: value.email.trim(),
      nit: value.nit.trim() || null,
    };
    const current = this.supplier();

    this.saving.set(true);
    this.formError.set(null);
    const request =
      current === null ? this.service.create(draft) : this.service.update(current.id, draft);
    request.subscribe({
      next: (supplier) => {
        this.saving.set(false);
        this.notifications.success(
          `Proveedor "${supplier.nombre}" ${current === null ? 'creado' : 'actualizado'}.`,
        );
        this.saved.emit(supplier);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        // 409: nombre o NIT repetido; el mensaje del backend dice cuál.
        this.formError.set(formLevelMessage(error));
      },
    });
  }
}
