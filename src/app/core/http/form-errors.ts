import { FormGroup } from '@angular/forms';
import { AppError } from './app-error';

/** Pasa los errores por campo del backend a los controles del formulario. */
export function applyFieldErrors(form: FormGroup, error: AppError): void {
  for (const [field, message] of Object.entries(error.fieldErrors)) {
    form.get(field)?.setErrors({ server: message });
  }
}

/** Mensaje a mostrar en un control, sea validación local o del servidor. */
export function firstErrorMessage(form: FormGroup, field: string): string | null {
  const control = form.get(field);
  if (!control || control.valid || !(control.dirty || control.touched)) {
    return null;
  }

  const errors = control.errors ?? {};
  if (typeof errors['server'] === 'string') return errors['server'];
  if (errors['required']) return 'Este campo es obligatorio.';
  if (errors['email']) return 'Ingresá un correo válido.';
  if (errors['minlength']) {
    return `Debe tener al menos ${errors['minlength'].requiredLength} caracteres.`;
  }
  return 'Valor inválido.';
}
