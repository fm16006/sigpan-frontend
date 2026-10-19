import { CatalogProduct } from '../../core/models/catalog.model';
import { PosLine } from './models/checkout.model';
import {
  MAX_ORDERS,
  PosOrdersState,
  activeOrder,
  addOrder,
  canAddOrder,
  cycleOrder,
  initialOrders,
  itemCount,
  listTotal,
  nextOrderNumber,
  orderTotal,
  parseOrders,
  pendingOrders,
  removeOrder,
  setOrderLines,
  setOrderTotal,
  switchOrder,
} from './pos-orders';

const NOW = '2026-10-19T10:00:00.000Z';

function line(id: number, precio: number, quantity: number): PosLine {
  return {
    quantity,
    product: {
      id,
      codigo: `P${id}`,
      nombre: `Producto ${id}`,
      descripcion: null,
      precio,
      categoriaId: 1,
      categoria: 'Pan dulce',
      unidadVenta: 'unidad',
      especialidad: 'PAN_DULCE',
      alergenos: null,
      activo: true,
      imagenUrl: null,
      stockMinimo: null,
      agotado: false,
    } satisfies CatalogProduct,
  };
}

/** Un estado con `count` pedidos; el último queda activo. */
function withOrders(count: number): PosOrdersState {
  let state = initialOrders(NOW);
  for (let i = 1; i < count; i++) {
    state = addOrder(state, NOW);
  }
  return state;
}

const names = (state: PosOrdersState) => state.orders.map((order) => order.nombre);

describe('pedidos en espera', () => {
  it('arranca con un "Pedido 1" vacío y activo', () => {
    const state = initialOrders(NOW);

    expect(names(state)).toEqual(['Pedido 1']);
    expect(activeOrder(state).lines).toEqual([]);
    expect(activeOrder(state).creadoEn).toBe(NOW);
  });

  it('agregar crea el siguiente pedido y lo deja activo', () => {
    const state = withOrders(3);

    expect(names(state)).toEqual(['Pedido 1', 'Pedido 2', 'Pedido 3']);
    expect(activeOrder(state).nombre).toBe('Pedido 3');
    expect(new Set(state.orders.map((order) => order.id)).size).toBe(3);
  });

  it('tiene un límite de pedidos abiertos', () => {
    const full = withOrders(MAX_ORDERS);

    expect(canAddOrder(full)).toBe(false);
    expect(addOrder(full, NOW)).toBe(full);
    expect(canAddOrder(withOrders(MAX_ORDERS - 1))).toBe(true);
  });

  it('la numeración reutiliza el menor número libre', () => {
    let state = withOrders(3);
    state = removeOrder(state, state.orders[1].id, NOW);

    expect(names(state)).toEqual(['Pedido 1', 'Pedido 3']);
    expect(nextOrderNumber(state.orders)).toBe(2);
    expect(names(addOrder(state, NOW))).toEqual(['Pedido 1', 'Pedido 3', 'Pedido 2']);
  });

  it('cambiar activa el pedido indicado y no hace nada con uno inexistente', () => {
    const state = withOrders(3);
    const first = state.orders[0].id;

    expect(switchOrder(state, first).activeId).toBe(first);
    expect(switchOrder(state, 999)).toBe(state);
    expect(switchOrder(state, state.activeId)).toBe(state);
  });

  it('ciclar da la vuelta en ambos sentidos', () => {
    const [a, b, c] = withOrders(3).orders.map((order) => order.id);
    let state = switchOrder(withOrders(3), a);

    state = cycleOrder(state);
    expect(state.activeId).toBe(b);
    state = cycleOrder(cycleOrder(state));
    expect(state.activeId).toBe(a);
    expect(cycleOrder(state, -1).activeId).toBe(c);
  });

  it('con un solo pedido ciclar no cambia nada', () => {
    const state = initialOrders(NOW);

    expect(cycleOrder(state)).toBe(state);
  });

  it('las líneas se cambian solo en el pedido indicado', () => {
    const base = withOrders(2);
    const [first, second] = base.orders;
    const state = setOrderLines(base, first.id, [line(1, 1.5, 2)]);

    expect(state.orders[0].lines).toHaveLength(1);
    expect(state.orders[1]).toBe(second);
  });

  describe('al quitar un pedido', () => {
    it('el activo cede el lugar al que lo seguía', () => {
      const base = withOrders(3);
      const [a, b, c] = base.orders.map((order) => order.id);
      const state = removeOrder(switchOrder(base, b), b, NOW);

      expect(state.orders.map((order) => order.id)).toEqual([a, c]);
      expect(state.activeId).toBe(c);
    });

    it('si era el último activo, pasa al anterior', () => {
      const base = withOrders(3);
      const [, b, c] = base.orders.map((order) => order.id);
      const state = removeOrder(base, c, NOW);

      expect(state.activeId).toBe(b);
    });

    it('quitar uno que no es el activo conserva el activo', () => {
      const base = withOrders(3);
      const [a, , c] = base.orders.map((order) => order.id);
      const state = removeOrder(base, a, NOW);

      expect(state.activeId).toBe(c);
      expect(state.orders).toHaveLength(2);
    });

    it('si no queda ninguno, abre un "Pedido 1" vacío', () => {
      const base = initialOrders(NOW);
      const loaded = setOrderLines(base, base.activeId, [line(1, 1, 1)]);
      const state = removeOrder(loaded, base.activeId, NOW);

      expect(names(state)).toEqual(['Pedido 1']);
      expect(activeOrder(state).lines).toEqual([]);
    });

    it('un id inexistente no cambia nada', () => {
      const base = withOrders(2);

      expect(removeOrder(base, 999, NOW)).toBe(base);
    });
  });

  describe('totales', () => {
    const order = (lines: PosLine[], total?: number) => ({
      id: 1,
      nombre: 'Pedido 1',
      creadoEn: NOW,
      lines,
      total,
    });

    it('el total de lista suma precio por cantidad sin error de coma flotante', () => {
      expect(listTotal(order([line(1, 0.1, 3), line(2, 0.2, 1)]))).toBe(0.5);
      expect(listTotal(order([line(1, 1.25, 3)]))).toBe(3.75);
    });

    it('el rótulo prefiere el total cotizado y cae al de lista', () => {
      const lines = [line(1, 1.25, 4)];

      expect(orderTotal(order(lines))).toBe(5);
      expect(orderTotal(order(lines, 4.5))).toBe(4.5);
    });

    it('un pedido vacío vale cero aunque guarde un total viejo', () => {
      expect(orderTotal(order([], 9))).toBe(0);
    });

    it('guardar el total no toca los demás pedidos y es idempotente', () => {
      const base = withOrders(2);
      const state = setOrderTotal(base, base.orders[0].id, 3.2);

      expect(state.orders[0].total).toBe(3.2);
      expect(state.orders[1]).toBe(base.orders[1]);
      expect(setOrderTotal(state, base.orders[0].id, 3.2)).toBe(state);
    });

    it('cambiar las líneas invalida el total cotizado', () => {
      const base = withOrders(1);
      const priced = setOrderTotal(base, base.activeId, 3.2);
      const state = setOrderLines(priced, base.activeId, [line(1, 1, 1)]);

      expect(state.orders[0].total).toBeUndefined();
    });

    it('cuenta artículos y detecta los pedidos pendientes de cobro', () => {
      const base = withOrders(3);
      const state = setOrderLines(base, base.orders[1].id, [line(1, 1, 2), line(2, 1, 3)]);

      expect(itemCount(state.orders[1])).toBe(5);
      expect(pendingOrders(state).map((item) => item.nombre)).toEqual(['Pedido 2']);
    });
  });

  describe('parseOrders', () => {
    it('acepta lo que se guardó', () => {
      const base = withOrders(2);
      const state = setOrderLines(base, base.activeId, [line(1, 1, 2)]);

      expect(parseOrders(JSON.parse(JSON.stringify(state)))).toEqual(state);
    });

    it('rechaza lo dañado o vacío', () => {
      expect(parseOrders(null)).toBeNull();
      expect(parseOrders({})).toBeNull();
      expect(parseOrders({ orders: [], activeId: 1 })).toBeNull();
      expect(parseOrders({ orders: [{ id: 1 }], activeId: 1 })).toBeNull();
      expect(
        parseOrders({
          orders: [{ id: 1, nombre: 'Pedido 1', creadoEn: NOW, lines: [{ quantity: 0, product: {} }] }],
          activeId: 1,
        }),
      ).toBeNull();
    });

    it('rechaza ids repetidos y más pedidos que el límite', () => {
      const one = initialOrders(NOW).orders[0];

      expect(parseOrders({ orders: [one, one], activeId: one.id })).toBeNull();
      const many = Array.from({ length: MAX_ORDERS + 1 }, (_, i) => ({ ...one, id: i + 1 }));
      expect(parseOrders({ orders: many, activeId: 1 })).toBeNull();
    });

    it('si el activo guardado ya no existe, usa el primero', () => {
      const base = withOrders(2);

      expect(parseOrders({ orders: base.orders, activeId: 999 })?.activeId).toBe(base.orders[0].id);
    });
  });
});
