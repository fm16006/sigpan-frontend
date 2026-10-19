import { Id } from '../../core/models/api.model';
import { DOCUMENT_TYPE_LABELS, DocumentType, Purchase } from '../../core/models/purchase.model';

export type PurchaseItemKind = 'materia-prima' | 'producto';

export interface PurchaseItemRef {
  readonly kind: PurchaseItemKind;
  readonly id: Id;
}

/** Redondeo a centavos, el mismo que aplica el backend al total. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function lineSubtotal(cantidad: number | null | undefined, costo: number | null | undefined): number {
  return Number(cantidad ?? 0) * Number(costo ?? 0);
}

/** Total de una compra en edición: suma los subtotales sin redondear cada línea. */
export function purchaseTotal(
  lines: readonly { readonly cantidad: number | null; readonly costoUnitario: number | null }[],
): number {
  return roundMoney(
    lines.reduce((sum, line) => sum + lineSubtotal(line.cantidad, line.costoUnitario), 0),
  );
}

/** Valor del <select> de ítems: «m:12» para un insumo, «p:8» para un producto de reventa. */
export function itemKey(ref: PurchaseItemRef): string {
  return `${ref.kind === 'producto' ? 'p' : 'm'}:${ref.id}`;
}

export function parseItemKey(key: string | null | undefined): PurchaseItemRef | null {
  const match = /^([mp]):(\d+)$/.exec(key ?? '');
  if (!match) {
    return null;
  }
  return { kind: match[1] === 'p' ? 'producto' : 'materia-prima', id: Number(match[2]) };
}

/** «Factura 000123» / «CCF 000123». */
export function documentLabel(tipo: DocumentType, numero: string): string {
  const name = tipo === 'CCF' ? 'CCF' : DOCUMENT_TYPE_LABELS[tipo];
  return `${name} ${numero}`;
}

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda por documento o proveedor. */
export function filterPurchases(purchases: readonly Purchase[], term: string): Purchase[] {
  const query = normalize(term);
  if (!query) {
    return [...purchases];
  }
  return purchases.filter((purchase) =>
    normalize(`${documentLabel(purchase.tipoDocumento, purchase.numeroDocumento)} ${purchase.proveedor}`).includes(
      query,
    ),
  );
}

export interface PurchaseKpis {
  readonly count: number;
  readonly total: number;
  readonly suppliers: number;
}

export function purchaseKpis(purchases: readonly Purchase[]): PurchaseKpis {
  return {
    count: purchases.length,
    total: roundMoney(purchases.reduce((sum, purchase) => sum + Number(purchase.total), 0)),
    suppliers: new Set(purchases.map((purchase) => purchase.proveedorId)).size,
  };
}

/** Fecha «YYYY-MM-DD» a texto corto local sin pasar por UTC (que la corre un día). */
export function shortDate(date: string | null | undefined): string {
  if (!date) {
    return '—';
  }
  return new Date(`${date}T00:00:00`).toLocaleDateString('es-SV', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** «YYYY-MM-DD» de hace `days` días. */
export function daysAgoIso(days: number, now: Date = new Date()): string {
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - days);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}
