import { FormControl } from '@angular/forms';
import { isValidNit, isValidNrc, nitValidator, nrcValidator, phoneValidator } from './fiscal-formats';

describe('NIT', () => {
  it.each(['0614-010190-101-3', '0000-000000-000-0', '01234567-8'])('acepta %s', (nit) => {
    expect(isValidNit(nit)).toBe(true);
  });

  it.each([
    '',
    '06140101901013',
    '0614-010190-101',
    '0614-010190-1013',
    '614-010190-101-3',
    '0614-010190-101-33',
    '0614-01019A-101-3',
    ' 0614-010190-101-3',
    '0123456-78',
    '012345678',
  ])('rechaza "%s"', (nit) => {
    expect(isValidNit(nit)).toBe(false);
  });

  it('rechaza null y undefined', () => {
    expect(isValidNit(null)).toBe(false);
    expect(isValidNit(undefined)).toBe(false);
  });
});

describe('NRC', () => {
  it.each(['123456-7', '000000-0', '1-9', '1234567-0'])('acepta %s', (nrc) => {
    expect(isValidNrc(nrc)).toBe(true);
  });

  it.each(['', '1234567', '12345678-0', '123456-78', '-1', '123456-', '12A456-7', '123456 7'])(
    'rechaza "%s"',
    (nrc) => {
      expect(isValidNrc(nrc)).toBe(false);
    },
  );
});

describe('validadores de formulario', () => {
  it('nitValidator deja pasar el vacío (lo atiende required) y marca el formato inválido', () => {
    expect(nitValidator(new FormControl(''))).toBeNull();
    expect(nitValidator(new FormControl('0614-010190-101-3'))).toBeNull();
    expect(nitValidator(new FormControl('123'))).toEqual({ nit: true });
  });

  it('nrcValidator marca el formato inválido', () => {
    expect(nrcValidator(new FormControl('123456-7'))).toBeNull();
    expect(nrcValidator(new FormControl('1234567'))).toEqual({ nrc: true });
  });

  it('phoneValidator acepta guiones y prefijo +503 y rechaza letras', () => {
    expect(phoneValidator(new FormControl('2222-3333'))).toBeNull();
    expect(phoneValidator(new FormControl('+503 2222 3333'))).toBeNull();
    expect(phoneValidator(new FormControl('abc'))).toEqual({ phone: true });
  });
});
