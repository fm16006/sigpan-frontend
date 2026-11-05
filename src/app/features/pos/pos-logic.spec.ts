import { CatalogProduct } from '../../core/models/catalog.model';
import { PriceScale } from '../../core/models/price-scale.model';
import {
  aperturaTotal,
  arqueoTotal,
  denominationLabel,
  filterProducts,
  findByCode,
  nextTier,
  posShortcut,
  ruleBadge,
  tierHintText,
} from './pos-logic';

function product(id: number, codigo: string, nombre: string, categoria = 'Pan dulce'): CatalogProduct {
  return {
    id,
    codigo,
    nombre,
    descripcion: null,
    precio: 0.45,
    categoriaId: 1,
    categoria,
    unidadVenta: 'unidad',
    especialidad: 'PAN_DULCE',
    alergenos: null,
    activo: true,
    imagenUrl: null,
    stockMinimo: 0,
    disponible: 10,
    agotado: false,
  };
}

const catalog = [
  product(1, 'PF-001', 'Pan francés', 'Pan francés'),
  product(2, 'PD-004', 'Concha de vainilla'),
  product(12, 'RV-010', 'Gaseosa 600 ml', 'Bebidas'),
];

function scale(cantidadMinima: number, precioUnitario: number, activo = true): PriceScale {
  return { id: cantidadMinima, productoId: 2, producto: 'Concha', cantidadMinima, precioUnitario, activo };
}

describe('findByCode', () => {
  it('encuentra el código exacto sin distinguir mayúsculas ni espacios', () => {
    expect(findByCode(catalog, ' pd-004 ')?.id).toBe(2);
    expect(findByCode(catalog, 'PF-001')?.id).toBe(1);
  });

  it('no confunde un código parcial con uno exacto', () => {
    expect(findByCode(catalog, 'PD-00')).toBeNull();
    expect(findByCode(catalog, 'concha')).toBeNull();
  });

  it('usa el id numérico como respaldo, pero el código gana', () => {
    expect(findByCode(catalog, '12')?.codigo).toBe('RV-010');
    const clash = [...catalog, product(99, '12', 'Producto con código numérico')];
    expect(findByCode(clash, '12')?.id).toBe(99);
  });

  it('devuelve null con texto vacío o sin coincidencia', () => {
    expect(findByCode(catalog, '  ')).toBeNull();
    expect(findByCode(catalog, 'ZZ-999')).toBeNull();
    expect(findByCode(catalog, '777')).toBeNull();
  });
});

describe('filterProducts', () => {
  it('busca por nombre o por parte del código', () => {
    expect(filterProducts(catalog, 'conCHA', '').map((p) => p.id)).toEqual([2]);
    expect(filterProducts(catalog, 'rv-0', '').map((p) => p.id)).toEqual([12]);
  });

  it('filtra por categoría y ordena por categoría y nombre', () => {
    expect(filterProducts(catalog, '', 'Bebidas').map((p) => p.id)).toEqual([12]);
    expect(filterProducts(catalog, '', '').map((p) => p.id)).toEqual([12, 2, 1]);
  });
});

describe('posShortcut', () => {
  it('F2 y F12 funcionan aunque se esté escribiendo', () => {
    expect(posShortcut('F2', true)).toBe('buscar');
    expect(posShortcut('F12', true)).toBe('cobrar');
  });

  it('+, − y Supr solo actúan fuera de los campos de texto', () => {
    expect(posShortcut('+', false)).toBe('mas');
    expect(posShortcut('-', false)).toBe('menos');
    expect(posShortcut('Delete', false)).toBe('quitar');
    expect(posShortcut('+', true)).toBeNull();
    expect(posShortcut('Delete', true)).toBeNull();
    expect(posShortcut('a', false)).toBeNull();
  });

  it('F3 y Ctrl+N abren un pedido nuevo aunque se esté escribiendo', () => {
    expect(posShortcut('F3', true)).toBe('nuevo-pedido');
    expect(posShortcut('n', true, { ctrl: true })).toBe('nuevo-pedido');
    expect(posShortcut('N', false, { ctrl: true })).toBe('nuevo-pedido');
  });

  it('Ctrl+Tab pasa al pedido siguiente y Ctrl+Mayús+Tab al anterior', () => {
    expect(posShortcut('Tab', true, { ctrl: true })).toBe('pedido-siguiente');
    expect(posShortcut('Tab', false, { ctrl: true, shift: true })).toBe('pedido-anterior');
    expect(posShortcut('Tab', false)).toBeNull();
  });

  it('con Ctrl no se cuelan las otras teclas', () => {
    expect(posShortcut('F2', false, { ctrl: true })).toBeNull();
    expect(posShortcut('+', false, { ctrl: true })).toBeNull();
  });
});

describe('nextTier (HU-33)', () => {
  const scales = [scale(24, 0.36), scale(12, 0.4)];

  it('avisa cuánto falta para el siguiente tramo y a qué precio', () => {
    const hint = nextTier(scales, 8, 0.45);
    expect(hint).toEqual({ missing: 4, minQuantity: 12, unitPrice: 0.4 });
    expect(tierHintText(hint!)).toContain('Con 4 más paga');
    expect(tierHintText(hint!)).toMatch(/0[.,]40 c\/u$/);
  });

  it('apunta al tramo siguiente cuando ya se alcanzó el anterior', () => {
    expect(nextTier(scales, 12, 0.4)).toEqual({ missing: 12, minQuantity: 24, unitPrice: 0.36 });
  });

  it('no avisa si el tramo está lejos', () => {
    expect(nextTier(scales, 1, 0.45)).toBeNull();
  });

  it('no avisa cuando no hay tramos mayores o no abaratan', () => {
    expect(nextTier(scales, 24, 0.36)).toBeNull();
    expect(nextTier([scale(12, 0.5)], 10, 0.45)).toBeNull();
    expect(nextTier([], 10, 0.45)).toBeNull();
  });

  it('ignora los tramos inactivos', () => {
    expect(nextTier([scale(12, 0.4, false)], 10, 0.45)).toBeNull();
  });
});

describe('ruleBadge', () => {
  it('abrevia la regla ganadora', () => {
    expect(ruleBadge('PROMOCION:3')).toBe('Promo');
    expect(ruleBadge('COMBO:1')).toBe('Combo');
    expect(ruleBadge('ESCALA:7')).toBe('Mayoreo');
    expect(ruleBadge('LIQUIDACION:1')).toBe('Liquidación');
    expect(ruleBadge(null)).toBe('');
  });
});

describe('arqueoTotal', () => {
  it('suma las denominaciones sin error de coma flotante', () => {
    expect(arqueoTotal({ 20: 3, 10: 4, 5: 2, 1: 9, 0.25: 11 })).toBe(121.75);
    expect(arqueoTotal({ 0.25: 3 })).toBe(0.75);
  });

  it('el fondo de apertura cuenta también las monedas de cinco centavos', () => {
    expect(aperturaTotal({ 10: 2, 5: 2, 1: 8, 0.25: 4, 0.05: 20 })).toBe(40);
    expect(aperturaTotal({ 0.05: 3 })).toBe(0.15);
    expect(denominationLabel(0.05)).toBe('$0.05');
    expect(denominationLabel(20)).toBe('$20');
  });

  it('una gaveta vacía suma cero y los negativos no restan', () => {
    expect(arqueoTotal({})).toBe(0);
    expect(arqueoTotal({ 20: -2 })).toBe(0);
  });
});
