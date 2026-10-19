import { TestBed } from '@angular/core/testing';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { CartStore } from '../../../core/services/cart-store';
import { ShopCart } from './shop-cart';

const base: CatalogProduct = {
  id: 7,
  codigo: 'BO-007',
  nombre: 'Bocadillo de jamón',
  descripcion: null,
  precio: 1.5,
  categoriaId: 2,
  categoria: 'Bocadillos',
  unidadVenta: 'unidad',
  especialidad: 'BOCADILLOS',
  alergenos: 'gluten',
  activo: true,
  imagenUrl: null,
  stockMinimo: 0,
  agotado: false,
};

describe('ShopCart', () => {
  let shop: ShopCart;
  let cart: CartStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    shop = TestBed.inject(ShopCart);
    cart = TestBed.inject(CartStore);
  });

  it('agrega al carrito un producto disponible', () => {
    shop.add({ ...base, disponible: 5 });

    expect(cart.quantityOf(base.id)).toBe(1);
  });

  it('no agrega un producto agotado', () => {
    shop.add({ ...base, disponible: 0, agotado: true });

    expect(cart.isEmpty()).toBe(true);
  });
});
