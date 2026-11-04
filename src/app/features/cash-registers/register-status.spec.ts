import { RegisterStatus } from '../../core/models/order.model';
import {
  cashDifference,
  differenceLabel,
  isoDaysAgo,
  occupiedSince,
  registerCounts,
} from './register-status';

const NOW = new Date(2026, 10, 3, 16, 48);

describe('occupiedSince (HU-68)', () => {
  it('un turno de hoy no es viejo', () => {
    const since = occupiedSince(new Date(2026, 10, 3, 7, 30).toISOString(), NOW);
    expect(since.label.startsWith('hoy ')).toBe(true);
    expect(since.stale).toBe(false);
  });

  it('un turno de ayer o de antes se marca como viejo', () => {
    const ayer = occupiedSince(new Date(2026, 10, 2, 18, 15).toISOString(), NOW);
    expect(ayer.label.startsWith('ayer ')).toBe(true);
    expect(ayer.stale).toBe(true);

    const antes = occupiedSince(new Date(2026, 9, 30, 8, 0).toISOString(), NOW);
    expect(antes.label.startsWith('hoy ') || antes.label.startsWith('ayer ')).toBe(false);
    expect(antes.stale).toBe(true);
  });
});

describe('cashDifference', () => {
  it('es contado menos esperado, a dos decimales', () => {
    expect(cashDifference(59.5, 60)).toBe(-0.5);
    expect(cashDifference(20.1, 20)).toBe(0.1);
    expect(cashDifference(20, 20)).toBe(0);
  });
});

describe('isoDaysAgo', () => {
  it('da la fecha local de hace n días', () => {
    expect(isoDaysAgo(0, NOW)).toBe('2026-11-03');
    expect(isoDaysAgo(7, NOW)).toBe('2026-10-27');
  });
});

describe('differenceLabel', () => {
  it('distingue faltante, sobrante y cuadre', () => {
    expect(differenceLabel(-0.5)).toEqual({ text: 'Faltante', tone: 'bad' });
    expect(differenceLabel(1)).toEqual({ text: 'Sobrante', tone: 'warn' });
    expect(differenceLabel(0)).toEqual({ text: 'Cuadra', tone: 'ok' });
    expect(differenceLabel(null)).toEqual({ text: 'Cuadra', tone: 'ok' });
  });
});

describe('registerCounts', () => {
  it('cuenta las cajas ocupadas y libres', () => {
    const list = [{ ocupada: true }, { ocupada: false }, { ocupada: true }] as RegisterStatus[];
    expect(registerCounts(list)).toEqual({ busy: 2, free: 1 });
  });
});
