import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * N.º de documento: obligatorio cuando el tipo de movimiento es ENTRADA.
 * El tipo se lee con una función para que el validador siempre vea el valor actual.
 */
export function documentoObligatorio(tipo: () => string | null | undefined): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const requerido = tipo() === 'ENTRADA';
    const vacio = String(control.value ?? '').trim() === '';
    return requerido && vacio ? { required: true } : null;
  };
}
