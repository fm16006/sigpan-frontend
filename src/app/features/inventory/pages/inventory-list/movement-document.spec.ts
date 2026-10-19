import { FormControl } from '@angular/forms';
import { documentoObligatorio } from './movement-document';

describe('documentoObligatorio', () => {
  it('exige el documento cuando el movimiento es ENTRADA', () => {
    const validator = documentoObligatorio(() => 'ENTRADA');
    expect(validator(new FormControl(''))).toEqual({ required: true });
  });

  it('considera vacío un documento con solo espacios', () => {
    const validator = documentoObligatorio(() => 'ENTRADA');
    expect(validator(new FormControl('   '))).toEqual({ required: true });
  });

  it('acepta el documento cuando el movimiento es ENTRADA', () => {
    const validator = documentoObligatorio(() => 'ENTRADA');
    expect(validator(new FormControl('FAC-0042'))).toBeNull();
  });

  it('no exige el documento en una SALIDA', () => {
    const validator = documentoObligatorio(() => 'SALIDA');
    expect(validator(new FormControl(''))).toBeNull();
  });

  it('reacciona al cambio de tipo, no solo al valor del campo', () => {
    let tipo = 'SALIDA';
    const validator = documentoObligatorio(() => tipo);
    const control = new FormControl('');
    expect(validator(control)).toBeNull();

    tipo = 'ENTRADA';
    expect(validator(control)).toEqual({ required: true });
  });
});
