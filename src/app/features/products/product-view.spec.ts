import { CatalogProduct } from '../../core/models/catalog.model';
import { ProductMovement } from './models/product-detail.model';
import {
  filterProducts,
  kardex,
  marginPercent,
  productKpis,
  promotionState,
  segmentCounts,
  stockPercent,
  stockState,
  summarizeMovements,
} from './product-view';

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

function movement(overrides: Partial<ProductMovement>): ProductMovement {
  return {
    id: 1,
    inventarioId: 1,
    productoId: 1,
    producto: 'Concha',
    tipo: 'ENTRADA',
    cantidad: 10,
    fecha: '2026-10-19T08:00:00',
    motivo: null,
    costoInicial: null,
    costoFinal: null,
    ...overrides,
  };
}

describe('stockState', () => {
  it('marca disponible cuando hay por encima del mínimo', () => {
    expect(stockState(product())).toBe('disponible');
  });

  it('marca reabastecer por debajo del mínimo', () => {
    expect(stockState(product({ disponible: 8, stockMinimo: 10 }))).toBe('reabastecer');
  });

  it('marca agotado en cero o con la bandera del backend', () => {
    expect(stockState(product({ disponible: 0 }))).toBe('agotado');
    expect(stockState(product({ disponible: null, agotado: true }))).toBe('agotado');
  });

  it('marca inactivo antes que cualquier otro estado', () => {
    expect(stockState(product({ activo: false, disponible: 0, agotado: true }))).toBe('inactivo');
  });

  it('no exige mínimo cuando no está definido', () => {
    expect(stockState(product({ stockMinimo: null, disponible: 3 }))).toBe('disponible');
  });
});

describe('stockPercent', () => {
  it('deja una franja visible cuando no hay existencia', () => {
    expect(stockPercent(product({ disponible: 0 }))).toBe(2);
  });

  it('llena la barra con tres veces el mínimo', () => {
    expect(stockPercent(product({ disponible: 90, stockMinimo: 30 }))).toBe(100);
    expect(stockPercent(product({ disponible: 30, stockMinimo: 30 }))).toBe(33);
  });
});

describe('filterProducts', () => {
  const list = [
    product({ id: 1, nombre: 'Semita alta', codigo: 'PD-011', disponible: 8, stockMinimo: 10 }),
    product({
      id: 2,
      nombre: 'Pan francés',
      codigo: 'PF-001',
      especialidad: 'PAN_FRANCES',
      disponible: 184,
      stockMinimo: 60,
    }),
    product({
      id: 3,
      nombre: 'Pastel tres leches',
      codigo: 'PS-007',
      especialidad: 'PASTELERIA',
      disponible: 0,
      agotado: true,
      stockMinimo: 1,
    }),
  ];
  const ids = (filters: Parameters<typeof filterProducts>[1]) =>
    filterProducts(list, filters).map((p) => p.id);

  it('busca por nombre sin importar acentos ni mayúsculas', () => {
    expect(ids({ query: 'FRANCES', segment: 'todos', especialidad: '' })).toEqual([2]);
  });

  it('busca por código', () => {
    expect(ids({ query: 'ps-0', segment: 'todos', especialidad: '' })).toEqual([3]);
  });

  it('filtra por segmento y especialidad', () => {
    expect(ids({ query: '', segment: 'reabastecer', especialidad: '' })).toEqual([1]);
    expect(ids({ query: '', segment: 'agotados', especialidad: '' })).toEqual([3]);
    expect(ids({ query: '', segment: 'todos', especialidad: 'PAN_FRANCES' })).toEqual([2]);
  });

  it('ordena por nombre', () => {
    const result = filterProducts(list, { query: '', segment: 'todos', especialidad: '' });
    expect(result.map((p) => p.nombre)).toEqual([
      'Pan francés',
      'Pastel tres leches',
      'Semita alta',
    ]);
  });

  it('cuenta los segmentos y los indicadores', () => {
    expect(segmentCounts(list)).toEqual({ todos: 3, disponibles: 1, reabastecer: 1, agotados: 1 });
    const kpis = productKpis([...list, product({ id: 4, activo: false })]);
    expect(kpis.activos).toBe(3);
    expect(kpis.bajoMinimo).toBe(1);
    expect(kpis.agotados).toBe(1);
    expect(kpis.bajoMinimoNombres).toEqual(['Semita alta']);
  });
});

describe('marginPercent', () => {
  it('calcula el margen sobre el precio', () => {
    expect(marginPercent(0.45, 0.26)).toBe(42);
  });

  it('devuelve null sin costo o sin precio', () => {
    expect(marginPercent(0.45, null)).toBeNull();
    expect(marginPercent(0, 0.2)).toBeNull();
  });

  it('puede ser negativo si se vende bajo el costo', () => {
    expect(marginPercent(1, 1.5)).toBe(-50);
  });
});

describe('summarizeMovements', () => {
  it('suma entradas y salidas de los últimos 7 días', () => {
    const summary = summarizeMovements(
      [
        movement({ id: 1, tipo: 'ENTRADA', cantidad: 36, fecha: '2026-10-19T06:00:00' }),
        movement({ id: 2, tipo: 'SALIDA', cantidad: 5, fecha: '2026-10-18T10:00:00' }),
        movement({ id: 3, tipo: 'SALIDA', cantidad: 4, fecha: '2026-10-17T10:00:00' }),
        movement({ id: 4, tipo: 'SALIDA', cantidad: 99, fecha: '2026-10-01T10:00:00' }),
      ],
      new Date('2026-10-19T12:00:00'),
    );
    expect(summary).toEqual({
      total: 3,
      entradas: 1,
      salidas: 2,
      entradasUnidades: 36,
      salidasUnidades: 9,
    });
  });
});

describe('kardex', () => {
  it('ordena del más reciente al más antiguo y filtra por tipo', () => {
    const list = [
      movement({ id: 1, tipo: 'ENTRADA', fecha: '2026-10-17T08:00:00' }),
      movement({ id: 2, tipo: 'SALIDA', fecha: '2026-10-19T08:00:00' }),
      movement({ id: 3, tipo: 'SALIDA', fecha: '2026-10-18T08:00:00' }),
    ];
    expect(kardex(list, 'todos').map((m) => m.id)).toEqual([2, 3, 1]);
    expect(kardex(list, 'SALIDA').map((m) => m.id)).toEqual([2, 3]);
  });
});

describe('promotionState', () => {
  const base = { activo: true, fechaInicio: '2026-10-15', fechaFin: '2026-10-31' };

  it('distingue vigente, programada y vencida', () => {
    expect(promotionState(base, '2026-10-19')).toBe('vigente');
    expect(promotionState(base, '2026-10-10')).toBe('programada');
    expect(promotionState(base, '2026-11-02')).toBe('vencida');
  });

  it('una promoción inactiva manda sobre las fechas', () => {
    expect(promotionState({ ...base, activo: false }, '2026-10-19')).toBe('inactiva');
  });

  it('sin fechas está vigente', () => {
    expect(promotionState({ activo: true, fechaInicio: null, fechaFin: null }, '2026-10-19')).toBe(
      'vigente',
    );
  });
});
