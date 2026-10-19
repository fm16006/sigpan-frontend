import { PosLine } from './models/checkout.model';

/** Pedidos en espera que puede tener abiertos una caja al mismo tiempo. */
export const MAX_ORDERS = 9;

/** Un ticket abierto en la caja. */
export interface PosOrder {
  readonly id: number;
  /** "Pedido 1", "Pedido 2"… */
  readonly nombre: string;
  readonly lines: readonly PosLine[];
  /** Instante en que se abrió, ISO 8601. */
  readonly creadoEn: string;
  /**
   * Último total que cotizó el backend para este pedido. Los pedidos en espera no se
   * vuelven a cotizar, así que el rótulo de la pestaña usa este valor.
   */
  readonly total?: number;
}

export interface PosOrdersState {
  readonly orders: readonly PosOrder[];
  readonly activeId: number;
}

const NAME_PREFIX = 'Pedido ';

/** Menor número de "Pedido N" que no está en uso: al descartar el 2, el siguiente vuelve a ser 2. */
export function nextOrderNumber(orders: readonly PosOrder[]): number {
  const used = new Set(
    orders.map((order) =>
      order.nombre.startsWith(NAME_PREFIX) ? Number(order.nombre.slice(NAME_PREFIX.length)) : NaN,
    ),
  );
  let number = 1;
  while (used.has(number)) {
    number++;
  }
  return number;
}

function newOrder(orders: readonly PosOrder[], now: string): PosOrder {
  const id = orders.reduce((max, order) => Math.max(max, order.id), 0) + 1;
  return { id, nombre: `${NAME_PREFIX}${nextOrderNumber(orders)}`, lines: [], creadoEn: now };
}

/** Estado inicial: un pedido vacío y activo. */
export function initialOrders(now: string): PosOrdersState {
  const order = newOrder([], now);
  return { orders: [order], activeId: order.id };
}

export function canAddOrder(state: PosOrdersState): boolean {
  return state.orders.length < MAX_ORDERS;
}

/** Agrega un pedido vacío y lo deja activo. En el límite no hace nada. */
export function addOrder(state: PosOrdersState, now: string): PosOrdersState {
  if (!canAddOrder(state)) {
    return state;
  }
  const order = newOrder(state.orders, now);
  return { orders: [...state.orders, order], activeId: order.id };
}

export function activeOrder(state: PosOrdersState): PosOrder {
  return state.orders.find((order) => order.id === state.activeId) ?? state.orders[0];
}

export function switchOrder(state: PosOrdersState, id: number): PosOrdersState {
  const exists = state.orders.some((order) => order.id === id);
  return exists && id !== state.activeId ? { ...state, activeId: id } : state;
}

/** Pasa al pedido siguiente (`step` 1) o anterior (−1), dando la vuelta al final. */
export function cycleOrder(state: PosOrdersState, step = 1): PosOrdersState {
  const count = state.orders.length;
  if (count < 2) {
    return state;
  }
  const index = state.orders.findIndex((order) => order.id === state.activeId);
  const target = state.orders[(index + step + count * Math.abs(step)) % count];
  return { ...state, activeId: target.id };
}

/**
 * Quita un pedido (cobrado o descartado). Si era el activo, pasa a ser activo el que
 * ocupaba su lugar (o el anterior, si era el último). Si no queda ninguno, abre uno vacío.
 */
export function removeOrder(state: PosOrdersState, id: number, now: string): PosOrdersState {
  const index = state.orders.findIndex((order) => order.id === id);
  if (index < 0) {
    return state;
  }
  const orders = state.orders.filter((order) => order.id !== id);
  if (orders.length === 0) {
    return initialOrders(now);
  }
  if (id !== state.activeId) {
    return { orders, activeId: state.activeId };
  }
  return { orders, activeId: orders[Math.min(index, orders.length - 1)].id };
}

/** Reemplaza las líneas de un pedido; el total cotizado anterior deja de valer. */
export function setOrderLines(
  state: PosOrdersState,
  id: number,
  lines: readonly PosLine[],
): PosOrdersState {
  return {
    ...state,
    orders: state.orders.map((order) =>
      order.id === id ? { id: order.id, nombre: order.nombre, creadoEn: order.creadoEn, lines } : order,
    ),
  };
}

/** Guarda el total cotizado de un pedido. Sin cambio devuelve el mismo estado. */
export function setOrderTotal(state: PosOrdersState, id: number, total: number): PosOrdersState {
  const order = state.orders.find((item) => item.id === id);
  if (!order || order.total === total) {
    return state;
  }
  return {
    ...state,
    orders: state.orders.map((item) => (item.id === id ? { ...item, total } : item)),
  };
}

export function itemCount(order: PosOrder): number {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0);
}

export function hasLines(order: PosOrder): boolean {
  return order.lines.length > 0;
}

/** Pedidos con algo cargado, es decir, los que se perderían sin cobrar. */
export function pendingOrders(state: PosOrdersState): readonly PosOrder[] {
  return state.orders.filter(hasLines);
}

/** Suma a precio de lista (en centavos, sin arrastrar error de coma flotante). Solo es un respaldo. */
export function listTotal(order: PosOrder): number {
  const cents = order.lines.reduce(
    (sum, line) => sum + Math.round(line.product.precio * 100) * line.quantity,
    0,
  );
  return cents / 100;
}

/** Total para el rótulo de un pedido: el cotizado y, si aún no hay, el de lista. 0 si está vacío. */
export function orderTotal(order: PosOrder): number {
  if (!hasLines(order)) {
    return 0;
  }
  return order.total ?? listTotal(order);
}

/**
 * Valida lo leído del almacenamiento. Devuelve `null` si no sirve (formato viejo o
 * dañado) y entonces se arranca con un pedido vacío.
 */
export function parseOrders(raw: unknown): PosOrdersState | null {
  const state = raw as Partial<PosOrdersState> | null | undefined;
  if (!state || !Array.isArray(state.orders) || state.orders.length === 0) {
    return null;
  }
  if (state.orders.length > MAX_ORDERS || !state.orders.every(isOrder)) {
    return null;
  }
  const ids = new Set(state.orders.map((order) => order.id));
  if (ids.size !== state.orders.length) {
    return null;
  }
  const activeId = ids.has(state.activeId as number) ? (state.activeId as number) : state.orders[0].id;
  return { orders: state.orders, activeId };
}

function isOrder(value: unknown): value is PosOrder {
  const order = value as Partial<PosOrder> | null | undefined;
  return (
    !!order &&
    typeof order.id === 'number' &&
    typeof order.nombre === 'string' &&
    typeof order.creadoEn === 'string' &&
    (order.total === undefined || typeof order.total === 'number') &&
    Array.isArray(order.lines) &&
    order.lines.every(isLine)
  );
}

function isLine(value: unknown): value is PosLine {
  const line = value as Partial<PosLine> | null | undefined;
  const product = line?.product;
  return (
    !!product &&
    typeof product.id === 'number' &&
    typeof product.nombre === 'string' &&
    typeof product.precio === 'number' &&
    typeof line.quantity === 'number' &&
    line.quantity > 0
  );
}
