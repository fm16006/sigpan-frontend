import { FormControl } from '@angular/forms';
import { notBeforeToday, todayIso } from './dates';

describe('todayIso', () => {
  it('devuelve la fecha local en formato YYYY-MM-DD', () => {
    const now = new Date(2026, 9, 18, 23, 30); // 18 de octubre, hora local
    expect(todayIso(now)).toBe('2026-10-18');
  });
});

describe('notBeforeToday', () => {
  it('rechaza una fecha anterior a hoy', () => {
    const control = new FormControl('2000-01-01');
    expect(notBeforeToday(control)).toEqual({ minDate: true });
  });

  it('acepta hoy y fechas futuras', () => {
    expect(notBeforeToday(new FormControl(todayIso()))).toBeNull();
    expect(notBeforeToday(new FormControl('2999-12-31'))).toBeNull();
  });

  it('no marca un valor vacío (eso lo resuelve required)', () => {
    expect(notBeforeToday(new FormControl(''))).toBeNull();
  });
});
