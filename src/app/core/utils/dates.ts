import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Fecha local en formato "YYYY-MM-DD", que es lo que usan los inputs type="date" y el backend. */
export function todayIso(now: Date = new Date()): string {
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}

/** Error { minDate } si la fecha "YYYY-MM-DD" es anterior a hoy. Vacía no se valida aquí. */
export function notBeforeToday(control: AbstractControl): ValidationErrors | null {
  const value = control.value as string | null;
  return value && value < todayIso() ? { minDate: true } : null;
}
