import { TestBed } from '@angular/core/testing';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { AuthSession } from '../../../core/models/user.model';
import { SessionStore } from '../../../core/services/session-store';
import { PosLine } from '../models/checkout.model';
import { MAX_ORDERS } from '../pos-orders';
import { PosOrdersStore } from './pos-orders.store';

function session(id: number, email: string): AuthSession {
  return { accessToken: 't', expiresIn: 900, user: { id, name: 'Ana Cajera', email, role: 'CAJERO' } };
}

const pan = {
  id: 4,
  codigo: 'P4',
  nombre: 'Pan',
  precio: 0.5,
  categoria: 'Pan dulce',
  agotado: false,
} as CatalogProduct;
const LINE: PosLine = { product: pan, quantity: 3 };

/** Un store nuevo sobre el mismo localStorage, como al recargar la página. */
function reload(): { store: PosOrdersStore; sessionStore: SessionStore } {
  TestBed.resetTestingModule();
  const sessionStore = TestBed.inject(SessionStore);
  sessionStore.set(session(7, 'ana@sigpan.test'));
  return { store: TestBed.inject(PosOrdersStore), sessionStore };
}

describe('PosOrdersStore', () => {
  let store: PosOrdersStore;
  let sessionStore: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    sessionStore = TestBed.inject(SessionStore);
    sessionStore.set(session(7, 'ana@sigpan.test'));
    store = TestBed.inject(PosOrdersStore);
  });

  it('arranca con un pedido vacío', () => {
    expect(store.pedidos().map((order) => order.nombre)).toEqual(['Pedido 1']);
    expect(store.lineas()).toEqual([]);
    expect(store.pendientes()).toEqual([]);
  });

  it('las líneas se cargan en el pedido activo y los otros quedan aparte', () => {
    store.cambiarLineas(() => [LINE]);
    store.crear();

    expect(store.activo().nombre).toBe('Pedido 2');
    expect(store.lineas()).toEqual([]);
    store.cambiar(store.pedidos()[0].id);
    expect(store.lineas()).toEqual([LINE]);
    expect(store.pendientes().map((order) => order.nombre)).toEqual(['Pedido 1']);
  });

  it('no crea más pedidos que el máximo', () => {
    for (let i = 1; i < MAX_ORDERS; i++) {
      expect(store.crear()).toBe(true);
    }

    expect(store.puedeCrear()).toBe(false);
    expect(store.crear()).toBe(false);
    expect(store.pedidos()).toHaveLength(MAX_ORDERS);
  });

  it('quitar el pedido activo pasa al siguiente', () => {
    store.crear();
    const [first, second] = store.pedidos();
    store.quitar(second.id);

    expect(store.pedidos().map((order) => order.id)).toEqual([first.id]);
    expect(store.activoId()).toBe(first.id);
  });

  it('sobrevive a recargar la página', () => {
    store.cambiarLineas(() => [LINE]);
    store.crear();

    const { store: after } = reload();
    after.cambiar(after.pedidos()[0].id);

    expect(after.pedidos().map((order) => order.nombre)).toEqual(['Pedido 1', 'Pedido 2']);
    expect(after.lineas()[0].quantity).toBe(3);
  });

  it('cada usuario tiene sus propios pedidos', () => {
    store.cambiarLineas(() => [LINE]);

    sessionStore.set(session(8, 'otro@sigpan.test'));
    expect(store.lineas()).toEqual([]);

    sessionStore.set(session(7, 'ana@sigpan.test'));
    expect(store.lineas()).toEqual([LINE]);
  });

  it('reiniciar descarta todo y deja un pedido vacío', () => {
    store.cambiarLineas(() => [LINE]);
    store.crear();
    store.reiniciar();

    expect(store.pedidos().map((order) => order.nombre)).toEqual(['Pedido 1']);
    expect(store.pendientes()).toEqual([]);
    expect(reload().store.pendientes()).toEqual([]);
  });

  it('un almacenamiento dañado arranca de cero', () => {
    localStorage.setItem('sigpan.pedidos.7', '{no es json');

    expect(reload().store.pedidos()).toHaveLength(1);
  });
});
