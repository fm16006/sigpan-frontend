import { Component, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, formLevelMessage } from '../../../../core/http/form-errors';
import { Company, CompanyDraft } from '../../../../core/models/company.model';
import { CompanyStore } from '../../../../core/services/company-store';
import { Notifications } from '../../../../core/services/notifications';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { COMPANY_LIMITS, companyErrorMessage, createCompanyForm } from './company-form';

/** Panel lateral para editar los datos de la empresa (registro único: no hay alta). */
@Component({
  selector: 'app-company-drawer',
  imports: [ReactiveFormsModule, FormDrawer],
  templateUrl: './company-drawer.html',
})
export class CompanyDrawer {
  private readonly store = inject(CompanyStore);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  readonly company = input<Company | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Company>();

  protected readonly limits = COMPANY_LIMITS;
  protected readonly form = createCompanyForm(this.fb);
  protected readonly saving = signal(false);
  /** Error general del backend, que no pertenece a un campo. */
  protected readonly formError = signal<string | null>(null);

  constructor() {
    // Cada vez que se abre, el formulario parte de los datos vigentes.
    effect(() => {
      if (!this.open()) {
        return;
      }
      const company = this.company();
      untracked(() => this.prepare(company));
    });
  }

  protected errorFor(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (control.valid || !(control.dirty || control.touched)) {
      return null;
    }
    return companyErrorMessage(control.errors);
  }

  protected cancel(): void {
    this.closed.emit();
  }

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    const draft: CompanyDraft = {
      razonSocial: value.razonSocial.trim(),
      nombreComercial: value.nombreComercial.trim(),
      nit: value.nit.trim(),
      nrc: value.nrc.trim(),
      giro: value.giro.trim(),
      direccion: value.direccion.trim(),
      telefono: value.telefono.trim(),
      correo: value.correo.trim() || null,
    };

    this.store.update(draft).subscribe({
      next: (company) => {
        this.saving.set(false);
        this.notifications.success('Datos de la empresa actualizados.');
        this.saved.emit(company);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        this.form.markAllAsTouched();
        this.formError.set(formLevelMessage(error));
      },
    });
  }

  private prepare(company: Company | null): void {
    this.formError.set(null);
    this.saving.set(false);
    this.form.reset();
    if (company) {
      this.form.setValue({
        razonSocial: company.razonSocial,
        nombreComercial: company.nombreComercial,
        nit: company.nit,
        nrc: company.nrc,
        giro: company.giro,
        direccion: company.direccion,
        telefono: company.telefono,
        correo: company.correo ?? '',
      });
    }
  }
}
