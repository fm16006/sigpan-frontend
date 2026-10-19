import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Formatos fiscales salvadoreños. Deben coincidir con `FormatosFiscales` del backend.
 *
 * NIT: 14 dígitos con guiones (0000-000000-000-0). También se acepta el NIT de persona
 * natural, que es el DUI (8 dígitos, guion y dígito verificador), porque una panadería
 * puede estar registrada a nombre de una persona natural.
 * NRC: de 1 a 7 dígitos, guion y un dígito verificador (nnnnnn-n).
 */
export const NIT_PATTERN = /^(\d{4}-\d{6}-\d{3}-\d|\d{8}-\d)$/;
export const NRC_PATTERN = /^\d{1,7}-\d$/;
export const PHONE_PATTERN = /^[0-9+()\- ]{8,20}$/;

export function isValidNit(value: string | null | undefined): boolean {
  return !!value && NIT_PATTERN.test(value);
}

export function isValidNrc(value: string | null | undefined): boolean {
  return !!value && NRC_PATTERN.test(value);
}

function patternValidator(key: string, test: (value: string) => boolean): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;
    // El vacío lo atiende `required`; este validador solo juzga el formato.
    if (value === null || value === undefined || value === '') {
      return null;
    }
    return test(String(value)) ? null : { [key]: true };
  };
}

export const nitValidator: ValidatorFn = patternValidator('nit', (v) => NIT_PATTERN.test(v));
export const nrcValidator: ValidatorFn = patternValidator('nrc', (v) => NRC_PATTERN.test(v));
export const phoneValidator: ValidatorFn = patternValidator('phone', (v) => PHONE_PATTERN.test(v));
