import { CatalogProduct } from '../../core/models/catalog.model';
import { PosCombo } from '../../core/models/combo.model';
import {
  COMBOS_CATEGORY,
  comboCategory,
  comboContents,
  comboSoldOut,
  mergeLines,
  planComboAdd,
  posCategories,
  posTiles,
} from './pos-logic';

function product(id: number, codigo: string, nombre: string, categoria: string): CatalogProduct {
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
  product(2, 'PD-004', 'Concha de vainilla', 'Pan dulce'),
  product(12, 'RV-010', 'Gaseosa 600 ml', 'Bebidas'),
];

function combo(
  id: number,
  nombre: string,
  categoria: string | null,
  lineas: PosCombo['lineas'],
  disponible = 5,
): PosCombo {
  return {
    id,
    nombre,
    descripcion: null,
    precio: 1.5,
    categoriaId: categoria ? 90 + id : null,
    categoria,
    sucursalId: 1,
    disponible,
    lineas,
  };
}

const DESAYUNO = combo(1, 'Desayuno', 'Promociones', [
  { productoId: 1, producto: 'Pan francés', cantidad: 2, precio: 0.45 },
  { productoId: 12, producto: 'Gaseosa 600 ml', cantidad: 1, precio: 1 },
]);
const SIN_CATEGORIA = combo(2, 'Merienda', null, [
  { productoId: 2, producto: 'Concha de vainilla', cantidad: 3, precio: 0.45 },
]);

describe('combos en la cuadrícula del punto de venta', () => {
  it('un combo sin categoría va a «Combos»', () => {
    expect(comboCategory(SIN_CATEGORIA)).toBe(COMBOS_CATEGORY);
    expect(comboCategory(DESAYUNO)).toBe('Promociones');
    expect(comboCategory({ categoria: '  ' })).toBe(COMBOS_CATEGORY);
  });

  it('una categoría que solo tiene combos también es una categoría del punto de venta', () => {
    expect(posCategories(catalog, [DESAYUNO])).toEqual([
      'Bebidas',
      'Pan dulce',
      'Pan francés',
      'Promociones',
    ]);
  });

  it('suma «Combos» cuando hay combos sin categoría y no repite las que ya existen', () => {
    const conPan = combo(3, 'Pan y concha', 'Pan dulce', DESAYUNO.lineas);

    expect(posCategories(catalog, [SIN_CATEGORIA, conPan])).toEqual([
      'Bebidas',
      'Combos',
      'Pan dulce',
      'Pan francés',
    ]);
  });

  it('una categoría que mezcla productos y combos muestra ambos, con el combo primero', () => {
    const conPan = combo(3, 'Pan y concha', 'Pan dulce', DESAYUNO.lineas);

    const tiles = posTiles(catalog, [conPan], '', 'Pan dulce');

    expect(tiles.map((tile) => tile.kind)).toEqual(['combo', 'product']);
    expect(tiles[0].kind === 'combo' && tiles[0].combo.nombre).toBe('Pan y concha');
    expect(tiles[1].kind === 'product' && tiles[1].product.nombre).toBe('Concha de vainilla');
  });

  it('una categoría solo de combos devuelve únicamente combos', () => {
    const tiles = posTiles(catalog, [DESAYUNO, SIN_CATEGORIA], '', 'Promociones');

    expect(tiles).toHaveLength(1);
    expect(tiles[0].kind).toBe('combo');
  });

  it('los combos sin categoría salen al elegir «Combos»', () => {
    const tiles = posTiles(catalog, [DESAYUNO, SIN_CATEGORIA], '', COMBOS_CATEGORY);

    expect(tiles.map((tile) => (tile.kind === 'combo' ? tile.combo.id : -1))).toEqual([2]);
  });

  it('el buscador encuentra combos por nombre, sin distinguir mayúsculas', () => {
    const tiles = posTiles(catalog, [DESAYUNO, SIN_CATEGORIA], 'desay', '');

    expect(tiles).toHaveLength(1);
    expect(tiles[0].kind === 'combo' && tiles[0].combo.id).toBe(1);
  });

  it('sin filtros agrupa todo por categoría', () => {
    const tiles = posTiles(catalog, [DESAYUNO, SIN_CATEGORIA], '', '');

    expect(tiles.map((tile) => tile.category)).toEqual([
      'Bebidas',
      'Combos',
      'Pan dulce',
      'Pan francés',
      'Promociones',
    ]);
  });

  it('describe el contenido y marca agotado cuando no alcanza ni uno', () => {
    expect(comboContents(DESAYUNO)).toBe('2 × Pan francés · 1 × Gaseosa 600 ml');
    expect(comboSoldOut({ disponible: 0 })).toBe(true);
    expect(comboSoldOut({ disponible: 3 })).toBe(false);
  });
});

describe('planComboAdd: expande un combo en sus productos', () => {
  const line = (id: number, quantity: number) => ({
    product: catalog.find((item) => item.id === id)!,
    quantity,
  });

  it('agrega todos los productos del combo con sus cantidades', () => {
    const plan = planComboAdd(DESAYUNO, catalog, []);

    expect(plan.error).toBeNull();
    expect(plan.lines.map((l) => [l.product.id, l.quantity])).toEqual([
      [1, 2],
      [12, 1],
    ]);
  });

  it('no agrega nada si un producto del combo no está en el catálogo del punto de venta', () => {
    const plan = planComboAdd(
      DESAYUNO,
      catalog.filter((item) => item.id !== 12),
      [],
    );

    expect(plan.lines).toEqual([]);
    expect(plan.error).toContain('Gaseosa 600 ml');
  });

  it('no agrega nada si no alcanza la existencia, contando lo que el pedido ya tiene', () => {
    const justo = catalog.map((item) => (item.id === 1 ? { ...item, disponible: 3 } : item));

    expect(planComboAdd(DESAYUNO, justo, [line(1, 1)]).error).toBeNull();
    const plan = planComboAdd(DESAYUNO, justo, [line(1, 2)]);

    expect(plan.lines).toEqual([]);
    expect(plan.error).toContain('Pan francés');
  });

  it('un combo agotado no se agrega', () => {
    const plan = planComboAdd({ ...DESAYUNO, disponible: 0 }, catalog, []);

    expect(plan.lines).toEqual([]);
    expect(plan.error).toBe('Desayuno está agotado.');
  });

  it('un producto agotado del combo lo bloquea', () => {
    const agotado = catalog.map((item) =>
      item.id === 12 ? { ...item, agotado: true, disponible: 0 } : item,
    );

    expect(planComboAdd(DESAYUNO, agotado, []).error).toBe('Gaseosa 600 ml está agotado.');
  });
});

describe('mergeLines', () => {
  const line = (id: number, quantity: number) => ({
    product: catalog.find((item) => item.id === id)!,
    quantity,
  });

  it('suma la cantidad de los productos que ya estaban y agrega los nuevos', () => {
    const merged = mergeLines([line(1, 1), line(2, 4)], [line(1, 2), line(12, 1)]);

    expect(merged.map((l) => [l.product.id, l.quantity])).toEqual([
      [1, 3],
      [2, 4],
      [12, 1],
    ]);
  });

  it('no modifica el pedido original', () => {
    const original = [line(1, 1)];

    mergeLines(original, [line(1, 2)]);

    expect(original[0].quantity).toBe(1);
  });

  it('tocar el mismo combo dos veces duplica las cantidades', () => {
    const first = mergeLines([], planComboAdd(DESAYUNO, catalog, []).lines);
    const second = mergeLines(first, planComboAdd(DESAYUNO, catalog, first).lines);

    expect(second.map((l) => [l.product.id, l.quantity])).toEqual([
      [1, 4],
      [12, 2],
    ]);
  });
});
