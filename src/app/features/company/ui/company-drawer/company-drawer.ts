import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, formLevelMessage } from '../../../../core/http/form-errors';
import { Company, CompanyDraft, taxConfigOf } from '../../../../core/models/company.model';
import { describeTaxChange, TAX_RATE_MAX, TAX_RATE_MIN, taxExample, taxRateLabel } from '../../../../core/models/tax.model';
import { CompanyStore } from '../../../../core/services/company-store';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { COMPANY_LIMITS, companyErrorMessage, createCompanyForm } from './company-form';

/** Panel lateral para editar los datos de la empresa (registro único: no hay alta). */
@Component({
  selector: 'app-company-drawer',
  imports: [ReactiveFormsModule, FormDrawer, ConfirmDialog],
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
  /** Cambios de IVA por confirmar: se explican antes de guardar y no se guarda sin aceptar. */
  protected readonly taxNotes = signal<readonly string[] | null>(null);
  private draft: CompanyDraft | null = null;
  protected readonly rateBounds = { min: TAX_RATE_MIN, max: TAX_RATE_MAX } as const;
  protected readonly applies = toSignal(this.form.controls.aplicaIva.valueChanges, {
    initialValue: this.form.controls.aplicaIva.value,
  });
  protected readonly included = toSignal(this.form.controls.ivaIncluido.valueChanges, {
    initialValue: this.form.controls.ivaIncluido.value,
  });
  protected readonly rate = toSignal(this.form.controls.tasaIva.valueChanges, {
    initialValue: this.form.controls.tasaIva.value,
  });

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
    // Con la confirmación abierta, Escape solo cierra la confirmación.
    if (this.taxNotes()) {
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
    const draft: CompanyDraft = {
      razonSocial: value.razonSocial.trim(),
      nombreComercial: value.nombreComercial.trim(),
      nit: value.nit.trim(),
      nrc: value.nrc.trim(),
      giro: value.giro.trim(),
      direccion: value.direccion.trim(),
      telefono: value.telefono.trim(),
      correo: value.correo.trim() || null,
      aplicaIva: value.aplicaIva,
      ivaIncluido: value.ivaIncluido,
      tasaIva: Number(value.tasaIva),
    };

    // Cambiar el IVA cambia lo que paga el cliente: se explica antes de guardar. Sin cambios de IVA se guarda directo.
    const notes = describeTaxChange(taxConfigOf(this.company()), draft);
    if (notes) {
      this.draft = draft;
      this.taxNotes.set(notes);
      return;
    }
    this.persist(draft);
  }

  protected confirmTaxChange(): void {
    const draft = this.draft;
    this.dismissTaxChange();
    if (draft) {
      this.persist(draft);
    }
  }

  protected dismissTaxChange(): void {
    this.taxNotes.set(null);
    this.draft = null;
  }

  private persist(draft: CompanyDraft): void {
    this.saving.set(true);
    this.formError.set(null);
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

  /** Ejemplo del efecto del IVA según lo que está elegido, para el texto de ayuda. */
  protected readonly taxHelp = computed(() => {
    if (!this.applies()) {
      return 'Sin IVA: los productos se cobran por su precio y el ticket no muestra IVA.';
    }
    const rate = Number(this.rate());
    if (!Number.isFinite(rate)) {
      return '';
    }
    const example = taxExample(rate);
    return this.included()
      ? `El precio ya incluye el IVA (${taxRateLabel(rate)}): un producto de ${example} se cobra ${example}, con el IVA adentro.`
      : `El IVA (${taxRateLabel(rate)}) se suma al precio: un producto de $1.00 se cobra ${example}.`;
  });

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
        ...taxConfigOf(company),
      });
    }
  }
}
