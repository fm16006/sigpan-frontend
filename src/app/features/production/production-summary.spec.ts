import { Production, ProductionStatus } from '../../core/models/production.model';
import {
  canTransition,
  matchesOrderSearch,
  matchesSegment,
  orderCode,
  orderUnits,
  progressSteps,
  segmentOf,
} from './production-summary';

const order = (overrides: Partial<Production> = {}): Production => ({
  id: 142,
  productoId: 1,
  producto: 'Concha de vainilla',
  formulaId: 7,
  formula: 'Concha clásica',
  cantidad: 3,
  estado: 'PENDIENTE',
  fecha: '2026-10-18T15:00:00',
  fechaPlanificada: '2026-10-19',
  comentario: null,
  ...overrides,
});

describe('orderCode', () => {
  it('rellena el id con ceros', () => {
    expect(orderCode(142)).toBe('ORD-0142');
    expect(orderCode(7)).toBe('ORD-0007');
    expect(orderCode(12345)).toBe('ORD-12345');
  });
});

describe('orderUnits', () => {
  it('multiplica lotes por lo que rinde la receta', () => {
    expect(orderUnits(order({ cantidad: 3 }), [{ id: 7, cantidadProduccion: 12 }])).toBe(36);
  });

  it('es null si la receta no está cargada', () => {
    expect(orderUnits(order(), [{ id: 9, cantidadProduccion: 12 }])).toBeNull();
  });
});

describe('segmentos', () => {
  it('agrupa los estados abiertos como activas', () => {
    expect(segmentOf('PENDIENTE')).toBe('activas');
    expect(segmentOf('CREADO')).toBe('activas');
    expect(segmentOf('PRODUCION')).toBe('activas');
    expect(segmentOf('TERMINADO')).toBe('terminadas');
    expect(segmentOf('CANCELADO')).toBe('canceladas');
  });

  it('todas incluye cualquier estado', () => {
    const statuses: ProductionStatus[] = ['PENDIENTE', 'CREADO', 'PRODUCION', 'TERMINADO', 'CANCELADO'];
    expect(statuses.every((status) => matchesSegment(status, 'todas'))).toBe(true);
    expect(matchesSegment('TERMINADO', 'activas')).toBe(false);
  });
});

describe('matchesOrderSearch', () => {
  it('busca por código, número, producto o receta', () => {
    expect(matchesOrderSearch(order(), 'ord-0142')).toBe(true);
    expect(matchesOrderSearch(order(), '142')).toBe(true);
    expect(matchesOrderSearch(order(), 'concha')).toBe(true);
    expect(matchesOrderSearch(order(), 'clásica')).toBe(true);
    expect(matchesOrderSearch(order(), 'semita')).toBe(false);
  });

  it('sin texto deja pasar todo', () => {
    expect(matchesOrderSearch(order(), '  ')).toBe(true);
  });
});

describe('progressSteps', () => {
  it('una orden pendiente o creada empieza en el primer paso', () => {
    expect(progressSteps('PENDIENTE')?.map((step) => step.state)).toEqual(['current', 'todo', 'todo']);
    expect(progressSteps('CREADO')?.map((step) => step.state)).toEqual(['current', 'todo', 'todo']);
  });

  it('en producción deja el primer paso hecho', () => {
    expect(progressSteps('PRODUCION')?.map((step) => step.state)).toEqual(['done', 'current', 'todo']);
  });

  it('terminada completa los tres pasos', () => {
    expect(progressSteps('TERMINADO')?.map((step) => step.state)).toEqual(['done', 'done', 'done']);
  });

  it('cancelada no tiene avance', () => {
    expect(progressSteps('CANCELADO')).toBeNull();
  });
});

describe('canTransition', () => {
  it('permite iniciar, terminar y cancelar una orden abierta', () => {
    expect(canTransition('PENDIENTE', 'PRODUCION')).toBe(true);
    expect(canTransition('PRODUCION', 'TERMINADO')).toBe(true);
    expect(canTransition('PRODUCION', 'CANCELADO')).toBe(true);
  });

  it('no permite volver atrás ni mover una orden cerrada', () => {
    expect(canTransition('PRODUCION', 'PENDIENTE')).toBe(false);
    expect(canTransition('TERMINADO', 'CANCELADO')).toBe(false);
    expect(canTransition('CANCELADO', 'PRODUCION')).toBe(false);
  });
});
