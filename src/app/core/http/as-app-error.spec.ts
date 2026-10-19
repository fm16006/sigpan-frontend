import { HttpErrorResponse } from '@angular/common/http';
import { AppError } from './app-error';
import { asAppError } from './as-app-error';

describe('asAppError', () => {
  it('deja pasar un AppError con sus errores por campo', () => {
    const error: AppError = {
      kind: 'validation',
      status: 422,
      message: 'Revisa los datos ingresados.',
      fieldErrors: { email: 'Ingresa un correo valido.' },
    };
    expect(asAppError(error)).toBe(error);
  });

  it('convierte un HttpErrorResponse crudo', () => {
    const response = new HttpErrorResponse({ status: 409, error: { message: 'Ya existe.' } });
    expect(asAppError(response)).toMatchObject({ kind: 'conflict', message: 'Ya existe.' });
  });
});
