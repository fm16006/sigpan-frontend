import { Purchase } from '../../core/models/purchase.model';
import {
  daysAgoIso,
  documentLabel,
  filterPurchases,
  itemKey,
  lineSubtotal,
  parseItemKey,
  purchaseKpis,
  purchaseTotal,
  roundMoney,
  shortDate,
} from './purchase-calc';

function purchase(overrides: Partial<Purchase> = {}): Purchase {
  return {
    id: 1,
    proveedorId: 4,
    proveedor: 'Molinos del Sur',
    tipoDocumento: 'FACTURA',
    numeroDocumento: '000322',
    fecha: '2026-10-10',
    total: 100,
    creadaEn: '2026-10-10T08:00:00',
    totalLineas: 1,
    lineas: [],
    ...overrides,
  };
}

describe('purchaseTotal', () => {
  it('suma cantidad por costo de cada línea', () => {
    expect(
      purchaseTotal([
        { cantidad: 10, costoUnitario: 1.25 },
        { cantidad: 24, costoUnitario: 0.4 },
      ]),
    ).toBe(22.1);
  });

  it('redondea a centavos al final, no línea por línea', () => {
    expect(purchaseTotal([{ cantidad: 3, costoUnitario: 0.3333 }])).toBe(1);
  });

  it('ignora los campos vacíos', () => {
    expect(purchaseTotal([{ cantidad: null, costoUnitario: 5 }])).toBe(0);
    expect(purchaseTotal([])).toBe(0);
  });
});

describe('lineSubtotal y roundMoney', () => {
  it('multiplica cantidad por costo', () => {
    expect(lineSubtotal(2.5, 4)).toBe(10);
    expect(lineSubtotal(undefined, 4)).toBe(0);
  });

  it('redondea a dos decimales', () => {
    expect(roundMoney(1.005)).toBe(1.01);
    expect(roundMoney(2.344)).toBe(2.34);
  });
});

describe('itemKey y parseItemKey', () => {
  it('ida y vuelta para insumos y productos', () => {
    expect(itemKey({ kind: 'materia-prima', id: 12 })).toBe('m:12');
    expect(itemKey({ kind: 'producto', id: 8 })).toBe('p:8');
    expect(parseItemKey('m:12')).toEqual({ kind: 'materia-prima', id: 12 });
    expect(parseItemKey('p:8')).toEqual({ kind: 'producto', id: 8 });
  });

  it('rechaza valores vacíos o mal formados', () => {
    expect(parseItemKey('')).toBeNull();
    expect(parseItemKey(null)).toBeNull();
    expect(parseItemKey('x:3')).toBeNull();
    expect(parseItemKey('m:')).toBeNull();
  });
});

describe('documentLabel', () => {
  it('nombra el tipo de documento', () => {
    expect(documentLabel('FACTURA', '000322')).toBe('Factura 000322');
    expect(documentLabel('CCF', '77')).toBe('CCF 77');
  });
});

describe('filterPurchases', () => {
  const list = [
    purchase({ id: 1, numeroDocumento: '000322' }),
    purchase({ id: 2, proveedor: 'Lácteos del Valle', tipoDocumento: 'CCF', numeroDocumento: '77' }),
  ];

  it('busca por número de documento', () => {
    expect(filterPurchases(list, '322').map((p) => p.id)).toEqual([1]);
  });

  it('busca por proveedor sin importar acentos ni mayúsculas', () => {
    expect(filterPurchases(list, 'LACTEOS').map((p) => p.id)).toEqual([2]);
  });

  it('busca por tipo de documento', () => {
    expect(filterPurchases(list, 'ccf').map((p) => p.id)).toEqual([2]);
  });

  it('sin texto devuelve todo', () => {
    expect(filterPurchases(list, '  ')).toHaveLength(2);
  });
});

describe('purchaseKpis', () => {
  it('cuenta compras, proveedores distintos y suma el total', () => {
    const kpis = purchaseKpis([
      purchase({ id: 1, total: 10.1 }),
      purchase({ id: 2, total: 20.2 }),
      purchase({ id: 3, proveedorId: 9, total: 5 }),
    ]);
    expect(kpis).toEqual({ count: 3, total: 35.3, suppliers: 2 });
  });
});

describe('fechas', () => {
  it('shortDate no corre el día por la zona horaria', () => {
    expect(shortDate('2026-10-01')).toContain('1');
    expect(shortDate(null)).toBe('—');
  });

  it('daysAgoIso resta días en calendario local', () => {
    expect(daysAgoIso(30, new Date(2026, 9, 19))).toBe('2026-09-19');
    expect(daysAgoIso(0, new Date(2026, 9, 19))).toBe('2026-10-19');
  });
});
