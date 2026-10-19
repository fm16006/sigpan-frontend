import { RawMaterialStock, StockMovement } from '../../core/models/inventory.model';
import { RawMaterial } from '../../core/models/production.model';
import {
  buildMaterialRows,
  consumption,
  daysOfSupply,
  filterMaterialRows,
  latestCost,
  latestCostByMaterial,
  materialCode,
  projectPurchase,
  statusOf,
  withRunningBalance,
} from './raw-material-calc';

const movement = (changes: Partial<StockMovement>): StockMovement => ({
  id: 1,
  inventarioId: 10,
  materiaPrimaId: 1,
  tipo: 'ENTRADA',
  cantidad: 10,
  fecha: '2026-10-01T08:00:00',
  motivo: null,
  documento: null,
  costoInicial: 1,
  costoFinal: 1,
  ...changes,
});

const material = (changes: Partial<RawMaterial> = {}): RawMaterial => ({
  id: 1,
  nombre: 'Harina de trigo',
  descripcion: null,
  unidadMedida: 'kg',
  stockMinimo: 25,
  precio: 1.4,
  activo: true,
  ...changes,
});

const stock = (changes: Partial<RawMaterialStock> = {}): RawMaterialStock => ({
  id: 10,
  materiaPrimaId: 1,
  materiaPrima: 'Harina de trigo',
  cantidad: 18.9,
  fechaActualizacion: null,
  ...changes,
});

describe('materialCode', () => {
  it('rellena el id con ceros', () => {
    expect(materialCode(3)).toBe('MP-03');
    expect(materialCode(120)).toBe('MP-120');
  });
});

describe('latestCost', () => {
  it('toma el costo final del movimiento más reciente', () => {
    const list = [
      movement({ id: 1, fecha: '2026-10-01T08:00:00', costoFinal: 1.5 }),
      movement({ id: 3, fecha: '2026-10-05T08:00:00', costoFinal: 1.52 }),
      movement({ id: 2, fecha: '2026-10-03T08:00:00', costoFinal: 1.4 }),
    ];
    expect(latestCost(list)).toBe(1.52);
  });

  it('devuelve null sin movimientos', () => {
    expect(latestCost([])).toBeNull();
  });
});

describe('latestCostByMaterial', () => {
  it('guarda el último costo de cada insumo', () => {
    const costs = latestCostByMaterial([
      movement({ id: 1, materiaPrimaId: 1, costoFinal: 1 }),
      movement({ id: 2, materiaPrimaId: 1, fecha: '2026-10-02T08:00:00', costoFinal: 2 }),
      movement({ id: 3, materiaPrimaId: 2, costoFinal: 5 }),
    ]);
    expect(costs.get(1)).toBe(2);
    expect(costs.get(2)).toBe(5);
  });
});

describe('buildMaterialRows', () => {
  it('usa el costo del movimiento y, si no hay, el precio', () => {
    const rows = buildMaterialRows(
      [material({ id: 1 }), material({ id: 2, nombre: 'Azúcar', precio: 0.95 })],
      [stock(), stock({ id: 11, materiaPrimaId: 2, cantidad: 40 })],
      new Map([[1, 1.5]]),
    );
    expect(rows[0].costoPromedio).toBe(1.5);
    expect(rows[1].costoPromedio).toBe(0.95);
  });

  it('marca bajo mínimo solo a insumos activos con inventario', () => {
    const rows = buildMaterialRows(
      [material({ id: 1 }), material({ id: 2, activo: false }), material({ id: 3 })],
      [stock(), stock({ id: 11, materiaPrimaId: 2, cantidad: 1 })],
      new Map(),
    );
    expect(rows.map((row) => row.bajoMinimo)).toEqual([true, false, false]);
    expect(rows.map((row) => row.estado)).toEqual(['bajo', 'inactiva', 'sin-inventario']);
  });
});

describe('statusOf', () => {
  const row = buildMaterialRows([material()], [stock()], new Map())[0];

  it('distingue agotado, reabastecer y suficiente', () => {
    expect(statusOf({ ...row, cantidad: 0 }, true)).toBe('agotada');
    expect(statusOf({ ...row, cantidad: 25 }, true)).toBe('bajo');
    expect(statusOf({ ...row, cantidad: 26 }, true)).toBe('suficiente');
  });
});

describe('filterMaterialRows', () => {
  const rows = buildMaterialRows(
    [
      material({ id: 1, nombre: 'Harina de trigo' }),
      material({ id: 2, nombre: 'Azúcar blanca', stockMinimo: 5 }),
    ],
    [stock(), stock({ id: 11, materiaPrimaId: 2, cantidad: 42 })],
    new Map(),
  );

  it('busca por nombre sin importar tildes ni mayúsculas', () => {
    expect(filterMaterialRows(rows, 'AZUCAR', 'todos').map((row) => row.itemId)).toEqual([2]);
  });

  it('busca por código', () => {
    expect(filterMaterialRows(rows, 'mp-01', 'todos').map((row) => row.itemId)).toEqual([1]);
  });

  it('el segmento bajo mínimo deja solo los que hay que reabastecer', () => {
    expect(filterMaterialRows(rows, '', 'bajo').map((row) => row.itemId)).toEqual([1]);
  });
});

describe('withRunningBalance', () => {
  const list = [
    movement({ id: 1, fecha: '2026-10-01T08:00:00', tipo: 'ENTRADA', cantidad: 50 }),
    movement({ id: 2, fecha: '2026-10-02T08:00:00', tipo: 'SALIDA', cantidad: 20 }),
    movement({ id: 3, fecha: '2026-10-03T08:00:00', tipo: 'ENTRADA', cantidad: 10 }),
  ];

  it('acumula desde cero y devuelve lo más reciente primero', () => {
    const lines = withRunningBalance(list, null);
    expect(lines.map((line) => line.saldo)).toEqual([40, 30, 50]);
    expect(lines.map((line) => line.delta)).toEqual([10, -20, 50]);
  });

  it('se ancla a la existencia actual', () => {
    const lines = withRunningBalance(list, 45);
    expect(lines[0].saldo).toBe(45);
    expect(lines[2].saldo).toBe(55);
  });
});

describe('projectPurchase', () => {
  it('calcula el promedio ponderado igual que el backend', () => {
    const after = projectPurchase(18.9, 1.5, 25, 1.52);
    expect(after.existencia).toBe(43.9);
    expect(after.costoPromedio).toBe(1.5114);
  });

  it('con existencia cero el costo es el de la compra', () => {
    expect(projectPurchase(0, 0, 10, 2.5).costoPromedio).toBe(2.5);
  });
});

describe('consumption y daysOfSupply', () => {
  const now = new Date('2026-10-19T12:00:00');
  const list = [
    movement({ id: 1, tipo: 'SALIDA', cantidad: 10, fecha: '2026-10-18T08:00:00' }),
    movement({ id: 2, tipo: 'SALIDA', cantidad: 5, fecha: '2026-10-01T08:00:00' }),
    movement({ id: 3, tipo: 'ENTRADA', cantidad: 50, fecha: '2026-10-18T09:00:00' }),
  ];

  it('suma solo las salidas dentro de la ventana', () => {
    expect(consumption(list, 7, now)).toBe(10);
  });

  it('estima los días que alcanza la existencia', () => {
    expect(daysOfSupply(20, 10, 7)).toBe(14);
    expect(daysOfSupply(20, 0, 7)).toBeNull();
  });
});

describe('existencias por sucursal (HU-61)', () => {
  it('la fila consolidada (suma de todas las sucursales) tiene existencia aunque no tenga id de inventario', () => {
    const [row] = buildMaterialRows(
      [material({ stockMinimo: 25 })],
      [stock({ id: null, cantidad: 18.9 })],
      new Map(),
    );

    expect(row.consolidado).toBe(true);
    expect(row.inventarioId).toBeNull();
    expect(row.estado).toBe('bajo');
    expect(row.bajoMinimo).toBe(true);
  });

  it('un insumo sin fila en la sucursal sigue figurando sin inventario', () => {
    const [row] = buildMaterialRows([material()], [], new Map());

    expect(row.consolidado).toBe(false);
    expect(row.estado).toBe('sin-inventario');
  });

  it('una fila de una sucursal concreta no es consolidada', () => {
    const [row] = buildMaterialRows([material()], [stock({ sucursalId: 2, sucursal: 'Norte' })], new Map());

    expect(row.consolidado).toBe(false);
    expect(row.inventarioId).toBe(10);
  });
});
