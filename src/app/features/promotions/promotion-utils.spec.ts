import { Promotion } from '../../core/models/promotion.model';
import {
  countBySegment,
  filterPromotions,
  formatMonth,
  formatShortDate,
  fullMonthOf,
  promotionStatus,
  scopeLabel,
  vigenciaLabel,
} from './promotion-utils';

function promo(overrides: Partial<Promotion> = {}): Promotion {
  return {
    id: 1,
    nombre: 'Pan del mes',
    descripcion: null,
    tipoDescuento: 'PORCENTAJE',
    valorDescuento: 10,
    fechaInicio: '2026-11-01',
    fechaFin: '2026-11-30',
    prioridad: 0,
    activo: true,
    ...overrides,
  };
}

describe('fullMonthOf', () => {
  it('detecta un mes calendario completo', () => {
    expect(fullMonthOf('2026-11-01', '2026-11-30')).toBe('2026-11');
    expect(fullMonthOf('2026-12-01', '2026-12-31')).toBe('2026-12');
  });

  it('respeta febrero en año bisiesto y no bisiesto', () => {
    expect(fullMonthOf('2028-02-01', '2028-02-29')).toBe('2028-02');
    expect(fullMonthOf('2026-02-01', '2026-02-28')).toBe('2026-02');
    expect(fullMonthOf('2026-02-01', '2026-02-27')).toBeNull();
  });

  it('rechaza rangos parciales, de varios meses o incompletos', () => {
    expect(fullMonthOf('2026-11-02', '2026-11-30')).toBeNull();
    expect(fullMonthOf('2026-11-01', '2026-11-29')).toBeNull();
    expect(fullMonthOf('2026-11-01', '2026-12-31')).toBeNull();
    expect(fullMonthOf(null, '2026-11-30')).toBeNull();
    expect(fullMonthOf('2026-11-01', null)).toBeNull();
  });
});

describe('promotionStatus', () => {
  it('calcula el estado por fecha y activo', () => {
    expect(promotionStatus(promo(), '2026-11-15')).toBe('VIGENTE');
    expect(promotionStatus(promo(), '2026-10-31')).toBe('PROGRAMADA');
    expect(promotionStatus(promo(), '2026-12-01')).toBe('VENCIDA');
    expect(promotionStatus(promo({ activo: false }), '2026-11-15')).toBe('INACTIVA');
  });
});

describe('formato', () => {
  it('formatea fechas y meses en español', () => {
    expect(formatShortDate('2026-05-12')).toBe('12 may 2026');
    expect(formatMonth('2026-11')).toBe('Noviembre 2026');
  });

  it('muestra el mes cuando es completo y el rango en otro caso', () => {
    expect(vigenciaLabel(promo())).toBe('Noviembre 2026');
    expect(vigenciaLabel(promo({ fechaInicio: '2026-11-05', fechaFin: '2026-11-20' }))).toBe(
      '5 nov 2026 — 20 nov 2026',
    );
  });

  it('distingue individual de bloque', () => {
    expect(scopeLabel(0)).toBe('Individual');
    expect(scopeLabel(1)).toBe('Individual');
    expect(scopeLabel(3)).toBe('Bloque · 3 productos');
  });
});

describe('filtros', () => {
  const list = [
    promo({ id: 1, nombre: 'Pan del mes' }),
    promo({ id: 2, nombre: 'Pastel', descripcion: 'Dos por uno', fechaInicio: '2027-01-01', fechaFin: '2027-01-31' }),
    promo({ id: 3, nombre: 'Café', activo: false }),
  ];

  it('filtra por segmento y por texto', () => {
    expect(filterPromotions(list, { segment: 'VIGENTE', term: '' }, '2026-11-10').map((p) => p.id)).toEqual([1]);
    expect(filterPromotions(list, { segment: 'TODAS', term: 'dos por' }, '2026-11-10').map((p) => p.id)).toEqual([2]);
    expect(filterPromotions(list, { segment: 'INACTIVA', term: '' }, '2026-11-10').map((p) => p.id)).toEqual([3]);
  });

  it('cuenta por segmento', () => {
    expect(countBySegment(list, '2026-11-10')).toEqual({
      TODAS: 3,
      VIGENTE: 1,
      PROGRAMADA: 1,
      VENCIDA: 0,
      INACTIVA: 1,
    });
  });
});
