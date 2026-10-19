import { Transfer } from '../../core/models/transfer.model';
import {
  branchesError,
  filterTransfers,
  itemKey,
  requestedByItem,
  shortages,
  transferKpis,
} from './transfer-calc';

function transfer(partial: Partial<Transfer>): Transfer {
  return {
    id: 1,
    documento: 'TRA-000001',
    sucursalOrigenId: 1,
    sucursalOrigen: 'Principal',
    sucursalDestinoId: 2,
    sucursalDestino: 'Norte',
    fecha: '2026-10-19',
    nota: null,
    usuarioId: 3,
    usuario: 'Bodega',
    creado: '2026-10-19T09:00:00',
    totalLineas: 1,
    lineas: [],
    ...partial,
  };
}

describe('transfer-calc', () => {
  const harina = { kind: 'materia-prima', id: 5 } as const;
  const pan = { kind: 'producto', id: 8 } as const;

  it('suma las líneas repetidas de un mismo artículo y descarta las incompletas', () => {
    const totals = requestedByItem([
      { ref: harina, cantidad: 2.5 },
      { ref: harina, cantidad: 1.25 },
      { ref: pan, cantidad: 4 },
      { ref: null, cantidad: 9 },
      { ref: pan, cantidad: 0 },
    ]);

    expect(totals.get(itemKey(harina))).toBe(3.75);
    expect(totals.get(itemKey(pan))).toBe(4);
    expect(totals.size).toBe(2);
  });

  it('detecta lo que el origen no alcanza a cubrir, contando el artículo una sola vez', () => {
    const available = new Map([
      [itemKey(harina), 5],
      [itemKey(pan), 10],
    ]);

    const missing = shortages(
      [
        { ref: harina, cantidad: 3 },
        { ref: harina, cantidad: 3 },
        { ref: pan, cantidad: 10 },
      ],
      available,
    );

    expect(missing).toEqual([{ key: itemKey(harina), requested: 6, available: 5 }]);
  });

  it('un artículo sin existencia en el origen cuenta como cero', () => {
    expect(shortages([{ ref: pan, cantidad: 1 }], new Map())).toEqual([
      { key: itemKey(pan), requested: 1, available: 0 },
    ]);
  });

  it('pedir exactamente la existencia no es faltante', () => {
    expect(shortages([{ ref: pan, cantidad: 10 }], new Map([[itemKey(pan), 10]]))).toEqual([]);
  });

  it('rechaza el mismo origen y destino pero no mientras falte alguno', () => {
    expect(branchesError(1, 1)).toContain('distintas');
    expect(branchesError(1, 2)).toBeNull();
    expect(branchesError(null, 2)).toBeNull();
    expect(branchesError(1, null)).toBeNull();
  });

  it('busca por documento, sucursal o nota sin importar tildes', () => {
    const list = [
      transfer({ id: 1, documento: 'TRA-000007' }),
      transfer({ id: 2, documento: 'TRA-000008', sucursalDestino: 'Santa Ana', nota: 'Reposición' }),
    ];

    expect(filterTransfers(list, 'tra-000007').map((t) => t.id)).toEqual([1]);
    expect(filterTransfers(list, 'santa').map((t) => t.id)).toEqual([2]);
    expect(filterTransfers(list, 'reposicion').map((t) => t.id)).toEqual([2]);
    expect(filterTransfers(list, '')).toHaveLength(2);
  });

  it('resume cuántos traslados, líneas y sucursales distintas intervienen', () => {
    const kpis = transferKpis([
      transfer({ totalLineas: 2 }),
      transfer({ id: 2, sucursalOrigenId: 2, sucursalDestinoId: 3, totalLineas: 3 }),
    ]);

    expect(kpis).toEqual({ count: 2, lines: 5, branches: 3 });
  });
});
