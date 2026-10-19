import { AbstractControl, FormBuilder, NonNullableFormBuilder, ValidationErrors, Validators } from '@angular/forms';
import { nitValidator, nrcValidator, phoneValidator } from '../../../../core/utils/fiscal-formats';
import { DEFAULT_TAX, TAX_RATE_MAX, TAX_RATE_MIN } from '../../../../core/models/tax.model';

/** Hasta tres enteros y dos decimales: 0 a 100.00. */
const TAX_RATE_PATTERN = /^\d{1,3}(\.\d{1,2})?$/;

export const COMPANY_LIMITS = {
  razonSocial: 120,
  nombreComercial: 100,
  giro: 150,
  direccion: 200,
  correo: 100,
} as const;

/** Obligatorio y no solo espacios (el backend usa @NotBlank). */
export function notBlank(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  return typeof value === 'string' && value.trim() === '' ? { required: true } : null;
}

/** Formulario de los datos de la empresa. Separado del componente para probarlo sin TestBed. */
export function createCompanyForm(fb: NonNullableFormBuilder = new FormBuilder().nonNullable) {
  const form = fb.group({
    razonSocial: ['', [notBlank, Validators.maxLength(COMPANY_LIMITS.razonSocial)]],
    nombreComercial: ['', [notBlank, Validators.maxLength(COMPANY_LIMITS.nombreComercial)]],
    nit: ['', [notBlank, nitValidator]],
    nrc: ['', [notBlank, nrcValidator]],
    giro: ['', [notBlank, Validators.maxLength(COMPANY_LIMITS.giro)]],
    direccion: ['', [notBlank, Validators.maxLength(COMPANY_LIMITS.direccion)]],
    telefono: ['', [notBlank, phoneValidator]],
    correo: ['', [Validators.email, Validators.maxLength(COMPANY_LIMITS.correo)]],
    // Impuestos (HU-36). Por defecto lo de siempre: IVA incluido en el precio, 13 %.
    aplicaIva: [DEFAULT_TAX.aplicaIva],
    ivaIncluido: [DEFAULT_TAX.ivaIncluido],
    tasaIva: [
      DEFAULT_TAX.tasaIva,
      [Validators.required, Validators.min(TAX_RATE_MIN), Validators.max(TAX_RATE_MAX), Validators.pattern(TAX_RATE_PATTERN)],
    ],
  });
  // Sin IVA no hay modo ni tasa que elegir: se deshabilitan (el valor se conserva).
  form.controls.aplicaIva.valueChanges.subscribe((applies) => {
    for (const control of [form.controls.ivaIncluido, form.controls.tasaIva]) {
      if (applies) {
        control.enable({ emitEvent: false });
      } else {
        control.disable({ emitEvent: false });
      }
    }
  });
  return form;
}

/** Mensaje de un error local del formulario de la empresa (los del servidor llegan como `server`). */
export function companyErrorMessage(errors: ValidationErrors | null): string | null {
  if (!errors) return null;
  if (typeof errors['server'] === 'string') return errors['server'];
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['nit']) return 'El NIT debe tener el formato 0000-000000-000-0 (14 dígitos con guiones).';
  if (errors['nrc']) return 'El NRC debe tener el formato nnnnnn-n (hasta 7 dígitos, guion y verificador).';
  if (errors['phone']) return 'Usá solo dígitos, espacios, guiones o +, de 8 a 20 caracteres.';
  if (errors['email']) return 'Ingresá un correo válido.';
  if (errors['min']) return 'La tasa no puede ser negativa.';
  if (errors['max']) return 'La tasa no puede pasar de 100 %.';
  if (errors['pattern']) return 'Usá hasta dos decimales, p. ej. 13 o 13.50.';
  if (errors['maxlength']) return `No puede tener más de ${errors['maxlength'].requiredLength} caracteres.`;
  return 'Valor inválido.';
}
