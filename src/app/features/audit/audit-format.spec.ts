import { formatearValor } from './audit-format';

describe('formatearValor', () => {
  it('muestra un guion cuando no hay valor', () => {
    expect(formatearValor(null)).toBe('—');
    expect(formatearValor('   ')).toBe('—');
  });

  it('muestra un valor escalar serializado como texto', () => {
    expect(formatearValor('12.50')).toBe('12.5');
    expect(formatearValor('"ADMIN"')).toBe('ADMIN');
  });

  it('describe un objeto con sus campos en lenguaje simple', () => {
    expect(formatearValor('{"estado":"CANCELADO","total":4}')).toBe('estado: CANCELADO; total: 4');
  });

  it('devuelve el texto original si no es JSON', () => {
    expect(formatearValor('Inicio de sesión')).toBe('Inicio de sesión');
  });
});
