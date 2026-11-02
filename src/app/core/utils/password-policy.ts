import { AbstractControl, ValidationErrors } from '@angular/forms';

export const PASSWORD_HINT = 'Al menos 8 caracteres, con mayúscula, minúscula y número.';

const COMPLEJA = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/;

/** CAR-08.1: la misma regla de UsuarioCreateRequest. Vacío lo resuelve `required`. */
export function passwordPolicy(control: AbstractControl<string>): ValidationErrors | null {
  return !control.value || COMPLEJA.test(control.value) ? null : { passwordPolicy: true };
}
