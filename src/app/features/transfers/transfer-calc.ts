import { Id } from '../../core/models/api.model';
import { Transfer } from '../../core/models/transfer.model';
import { PurchaseItemRef, itemKey } from '../purchases/purchase-calc';

export { itemKey, parseItemKey, shortDate } from '../purchases/purchase-calc';

/** Una línea del formulario ya leída: qué artículo y cuánto. */
export interface RequestedLine {
  readonly ref: PurchaseItemRef | null;
  readonly cantidad: number;
}

export interface Shortage {
  readonly key: string;
  readonly requested: number;
  readonly available: number;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** Cantidad total pedida por artículo: dos líneas del mismo artículo se suman, como hace el backend. */
export function requestedByItem(lines: readonly RequestedLine[]): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    if (!line.ref || !(line.cantidad > 0)) continue;
    const key = itemKey(line.ref);
    totals.set(key, round3((totals.get(key) ?? 0) + line.cantidad));
  }
  return totals;
}

/** Artículos cuya cantidad pedida supera la existencia del origen (lo que el backend rechazaría). */
export function shortages(
  lines: readonly RequestedLine[],
  available: ReadonlyMap<string, number>,
): Shortage[] {
  return [...requestedByItem(lines)]
    .map(([key, requested]) => ({ key, requested, available: available.get(key) ?? 0 }))
    .filter((item) => item.requested > item.available);
}

/** Mensaje si el origen y el destino no sirven; null si están bien o aún falta elegir alguno. */
export function branchesError(origin: Id | null, destination: Id | null): string | null {
  if (!origin || !destination) {
    return null;
  }
  return origin === destination ? 'El origen y el destino deben ser sucursales distintas.' : null;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda por documento, sucursal o nota. */
export function filterTransfers(transfers: readonly Transfer[], term: string): Transfer[] {
  const query = normalize(term);
  if (!query) {
    return [...transfers];
  }
  return transfers.filter((transfer) =>
    normalize(
      `${transfer.documento} ${transfer.sucursalOrigen} ${transfer.sucursalDestino} ${transfer.nota ?? ''}`,
    ).includes(query),
  );
}

export interface TransferKpis {
  readonly count: number;
  readonly lines: number;
  readonly branches: number;
}

export function transferKpis(transfers: readonly Transfer[]): TransferKpis {
  const branches = new Set<Id>();
  for (const transfer of transfers) {
    branches.add(transfer.sucursalOrigenId);
    branches.add(transfer.sucursalDestinoId);
  }
  return {
    count: transfers.length,
    lines: transfers.reduce((sum, transfer) => sum + transfer.totalLineas, 0),
    branches: branches.size,
  };
}
