import { TestBed } from '@angular/core/testing';
import { CatalogProduct } from '../models/catalog.model';
import { CartStore } from './cart-store';

const pan: CatalogProduct = {
  id: 3,
  nombre: 'Pan francés',
  descripcion: null,
  precio: 0.25,
  categoriaId: 1,
  categoria: 'Pan',
  activo: true,
  imagenUrl: null,
  stockMinimo: 1,
};

describe('CartStore', () => {
  let cart: CartStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    cart = TestBed.inject(CartStore);
  });

  it('acumula la cantidad del mismo producto y calcula el subtotal', () => {
    cart.add(pan, 2);
    cart.add(pan, 3);

    expect(cart.lines().length).toBe(1);
    expect(cart.count()).toBe(5);
    expect(cart.subtotal()).toBeCloseTo(1.25);
  });

  it('arma el pedido con el formato que espera el backend', () => {
    cart.add(pan, 4);

    expect(cart.toOrderRequest()).toEqual({ lineas: [{ productoId: 3, cantidad: 4 }] });
  });

  it('quita la línea cuando la cantidad llega a cero', () => {
    cart.add(pan);
    cart.setQuantity(pan.id, 0);

    expect(cart.isEmpty()).toBe(true);
  });
});
