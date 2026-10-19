import { CatalogProduct } from '../../core/models/catalog.model';
import { CHANNEL_KEYS, isChannelOn, matchesChannel } from './product-channels';
import { filterProducts } from './product-view';

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 1,
    codigo: 'PD-004',
    nombre: 'Concha de vainilla',
    descripcion: null,
    precio: 0.45,
    categoriaId: 1,
    categoria: 'Pan dulce',
    unidadVenta: 'unidad',
    especialidad: 'PAN_DULCE',
    alergenos: null,
    activo: true,
    imagenUrl: null,
    stockMinimo: 30,
    disponible: 36,
    agotado: false,
    ...overrides,
  };
}

describe('canales de venta del producto', () => {
  it('maneja los dos canales: punto de venta y tienda en línea', () => {
    expect(CHANNEL_KEYS).toEqual(['disponiblePos', 'disponibleTienda']);
  });

  it('un producto sin el campo (respuesta vieja) cuenta como habilitado', () => {
    expect(isChannelOn(product(), 'disponiblePos')).toBe(true);
    expect(isChannelOn(product(), 'disponibleTienda')).toBe(true);
  });

  it('lee cada canal por separado', () => {
    const soloTienda = product({ disponiblePos: false, disponibleTienda: true });
    expect(isChannelOn(soloTienda, 'disponiblePos')).toBe(false);
    expect(isChannelOn(soloTienda, 'disponibleTienda')).toBe(true);
  });

  describe('filtro por canal', () => {
    const ambos = product({ id: 1, nombre: 'Ambos' });
    const soloPos = product({ id: 2, nombre: 'Solo POS', disponibleTienda: false });
    const soloTienda = product({ id: 3, nombre: 'Solo tienda', disponiblePos: false });
    const ninguno = product({ id: 4, nombre: 'Ninguno', disponiblePos: false, disponibleTienda: false });
    const todos = [ninguno, soloTienda, soloPos, ambos];
    const nombres = (canal: Parameters<typeof matchesChannel>[1]) =>
      filterProducts(todos, { query: '', segment: 'todos', especialidad: '', canal }).map(
        (item) => item.nombre,
      );

    it('sin filtro deja pasar todo', () => {
      expect(nombres('')).toHaveLength(4);
      expect(nombres(undefined)).toHaveLength(4);
    });

    it('POS deja los habilitados en el punto de venta', () => {
      expect(nombres('POS')).toEqual(['Ambos', 'Solo POS']);
    });

    it('TIENDA deja los habilitados en la tienda en línea', () => {
      expect(nombres('TIENDA')).toEqual(['Ambos', 'Solo tienda']);
    });

    it('APAGADO deja los que tienen algún canal deshabilitado', () => {
      expect(nombres('APAGADO')).toEqual(['Ninguno', 'Solo POS', 'Solo tienda']);
    });

    it('se combina con los demás filtros', () => {
      const inactivoSoloPos = product({ id: 5, nombre: 'Agotado POS', agotado: true, disponible: 0 });
      const resultado = filterProducts([ambos, inactivoSoloPos], {
        query: '',
        segment: 'agotados',
        especialidad: '',
        canal: 'POS',
      });
      expect(resultado.map((item) => item.nombre)).toEqual(['Agotado POS']);
    });
  });
});
