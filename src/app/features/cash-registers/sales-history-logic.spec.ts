import { SaleSummary } from '../../core/models/order.model';
import { csvRow, parseSearch, statusOptions, whoOf } from './sales-history-logic';

const SALE: SaleSummary = {
  id: 31,
  tipo: 'MOSTRADOR',
  estado: 'ANULADA',
  fecha: '2026-11-01T17:05:42',
  total: 2.5,
  metodoPago: 'EFECTIVO',
  cajaId: 10,
  caja: 'Caja 01',
  turnoId: 4,
  cajero: 'Ana',
  cliente: null,
  modalidad: null,
  encargo: false,
  numeroControl: null,
};

describe('Historial de ventas (HU-69)', () => {
  it('un número busca la venta; un texto, al cliente', () => {
    expect(parseSearch(' #31 ')).toEqual({ numero: 31 });
    expect(parseSearch('maria@')).toEqual({ cliente: 'maria@' });
    expect(parseSearch('   ')).toEqual({});
  });

  it('los estados dependen del canal', () => {
    expect(statusOptions('MOSTRADOR')).toEqual(['COMPLETADA', 'ANULADA']);
    expect(statusOptions('EN_LINEA')).toContain('ENTREGADO');
    expect(statusOptions('EN_LINEA')).not.toContain('ANULADA');
    expect(statusOptions(null)).toHaveLength(10);
  });

  it('muestra al cajero en mostrador y al cliente en los pedidos', () => {
    expect(whoOf(SALE)).toBe('Ana');
    expect(whoOf({ ...SALE, tipo: 'EN_LINEA', cajero: null, cliente: 'María' })).toBe('María');
  });

  it('arma la fila del CSV con etiquetas legibles', () => {
    expect(csvRow(SALE)).toEqual([31, '2026-11-01 17:05', 'Mostrador', 'Anulada', 'Ana', 'Caja 01', 'Efectivo', 2.5]);
  });
});
