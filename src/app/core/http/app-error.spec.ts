import { HttpErrorResponse } from '@angular/common/http';
import { toAppError } from './app-error';

describe('toAppError', () => {
  it('trata el 423 como cuenta bloqueada y conserva el mensaje del backend', () => {
    const error = toAppError(
      new HttpErrorResponse({
        status: 423,
        error: { message: 'Cuenta bloqueada por intentos fallidos. Intenta de nuevo a las 15:15', code: 'LOCKED' },
      }),
    );

    expect(error.kind).toBe('locked');
    expect(error.message).toBe('Cuenta bloqueada por intentos fallidos. Intenta de nuevo a las 15:15');
  });
});
