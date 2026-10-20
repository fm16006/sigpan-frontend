import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { Promotion } from '../../../../core/models/promotion.model';
import { PromotionForm } from './promotion-form';

const BASE = 'https://api.sigpan.test/api/v1';
const CONFIG: ApiConfig = { baseUrl: BASE, origin: 'https://api.sigpan.test', timeoutMs: 5000 };

const PRODUCTS = [
  { id: 1, codigo: 'P-1', nombre: 'Pan francés', categoria: 'Panes', categoriaId: 10, activo: true },
  { id: 2, codigo: 'P-2', nombre: 'Pastel de tres leches con cobertura de dulce de leche y fresas', categoria: 'Postres', categoriaId: 20, activo: true },
  { id: 3, codigo: 'P-3', nombre: 'PRUEBA-MVEW5GZO BOCADILLOS', categoria: 'Panes', categoriaId: 10, activo: false },
  { id: 4, codigo: 'P-4', nombre: 'Café con leche', categoria: 'Bebidas', categoriaId: 30, activo: true },
];

const CATEGORIES = [
  { id: 10, nombre: 'Panes', activo: true, productosActivos: 1, productos: 2 },
  { id: 20, nombre: 'Postres', activo: true, productosActivos: 1, productos: 1 },
  { id: 30, nombre: 'Bebidas', activo: true, productosActivos: 1, productos: 1 },
  { id: 40, nombre: 'Temporada vieja', activo: false, productosActivos: 0, productos: 3 },
];

const PROMOTION: Promotion = {
  id: 7,
  nombre: 'Pan del mes',
  descripcion: null,
  tipoDescuento: 'PORCENTAJE',
  valorDescuento: 10,
  fechaInicio: '2026-11-01',
  fechaFin: '2026-11-30',
  prioridad: 0,
  activo: true,
  alcance: 'PRODUCTOS',
  productoIds: [1],
  categoriaIds: [],
  categorias: [],
};

describe('Formulario de promoción: alcance', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PromotionForm>;

  const html = () => fixture.nativeElement as HTMLElement;
  const form = () =>
    (fixture.componentInstance as unknown as { form: { patchValue(v: object): void } }).form;

  async function tick(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function open(promotion: Promotion | null): Promise<void> {
    fixture = TestBed.createComponent(PromotionForm);
    fixture.componentRef.setInput('promotion', promotion);
    await tick();
    httpMock.expectOne(`${BASE}/productos`).flush(PRODUCTS);
    httpMock.expectOne(`${BASE}/categorias`).flush(CATEGORIES);
    await tick();
  }

  async function submit(): Promise<void> {
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();
  }

  async function chooseScope(value: string): Promise<void> {
    const radio = Array.from(html().querySelectorAll<HTMLInputElement>('input[name="alcance"]')).find(
      (input) => input.value === value,
    )!;
    radio.click();
    await tick();
  }

  const productRows = () => Array.from(html().querySelectorAll<HTMLElement>('[data-product-list] li'));
  const rowNames = () => productRows().map((row) => row.querySelector('span span')!.textContent!.trim());
  const search = () => html().querySelector<HTMLInputElement>('input[type="search"]')!;
  const selectedCount = () => html().querySelector('[data-selected-count]')!.textContent!.replace(/\s+/g, ' ').trim();

  async function type(term: string): Promise<void> {
    search().value = term;
    search().dispatchEvent(new Event('input'));
    await tick();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ofrece los tres alcances y una promoción nueva parte de productos específicos', async () => {
    await open(null);

    const labels = Array.from(html().querySelectorAll('[aria-label="Alcance de la promoción"] label')).map((l) =>
      l.querySelector('span span')!.textContent!.trim(),
    );
    expect(labels).toEqual(['Todos los productos', 'Por categoría', 'Productos específicos']);
    expect(html().querySelector('[data-scope-panel="productos"]')).not.toBeNull();
  });

  it('el selector de productos muestra los nombres completos y solo productos activos, en una columna', async () => {
    await open(null);

    expect(rowNames()).toEqual([
      'Pan francés',
      'Pastel de tres leches con cobertura de dulce de leche y fresas',
      'Café con leche',
    ]);
    expect(html().textContent).not.toContain('PRUEBA-MVEW5GZO');
    const list = html().querySelector('[data-product-list]')!;
    expect(list.className).not.toContain('grid-cols-2');
    expect(list.className).not.toContain('sm:grid-cols');
    expect(list.className).toContain('overflow-y-auto');
    const name = html().querySelector<HTMLElement>('[data-product-list] .line-clamp-2')!;
    expect(name.className).toContain('break-words');
  });

  it('el buscador filtra por nombre sin importar tildes y mayúsculas', async () => {
    await open(null);

    await type('CAFE');
    expect(rowNames()).toEqual(['Café con leche']);

    await type('leche');
    expect(rowNames()).toHaveLength(2);

    await type('inexistente');
    expect(html().textContent).toContain('Ningún producto activo coincide');
  });

  it('«Seleccionar los filtrados» marca solo lo que muestra el buscador y «Limpiar» desmarca todo', async () => {
    await open(null);

    await type('leche');
    html().querySelector<HTMLButtonElement>('[data-action="select-filtered"]')!.click();
    await tick();
    expect(selectedCount()).toBe('2 seleccionados');

    await type('');
    expect(html().querySelectorAll<HTMLInputElement>('[data-product-list] input:checked')).toHaveLength(2);

    html().querySelector<HTMLButtonElement>('[data-action="clear"]')!.click();
    await tick();
    expect(selectedCount()).toBe('0 seleccionados');
  });

  it('sin productos elegidos no envía nada y avisa junto al selector', async () => {
    await open(null);
    form().patchValue({ nombre: 'Sin productos', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' });

    await submit();

    httpMock.expectNone(`${BASE}/promociones`);
    expect(html().textContent).toContain('Elegí al menos un producto activo.');
  });

  it('crea una promoción por productos enviando alcance y productoIds', async () => {
    await open(null);
    form().patchValue({ nombre: 'Dos productos', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' });
    const boxes = html().querySelectorAll<HTMLInputElement>('[data-product-list] input[type="checkbox"]');
    boxes[0].click();
    boxes[2].click();
    await tick();

    await submit();

    const request = httpMock.expectOne(`${BASE}/promociones`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({
      nombre: 'Dos productos',
      alcance: 'PRODUCTOS',
      productoIds: [1, 4],
      categoriaIds: [],
    });
    request.flush({ ...PROMOTION, id: 8 });
  });

  it('por categoría lista solo las categorías activas con cuántos productos tiene cada una', async () => {
    await open(null);

    await chooseScope('CATEGORIAS');

    const text = html().querySelector('[data-scope-panel="categorias"]')!.textContent!.replace(/\s+/g, ' ');
    expect(text).toContain('Panes 1 producto');
    expect(text).toContain('Postres 1 producto');
    expect(text).toContain('Bebidas 1 producto');
    expect(text).not.toContain('Temporada vieja');
    expect(html().querySelector('[data-product-list]')).toBeNull();
  });

  it('crea una promoción por categorías y no manda productos', async () => {
    await open(null);
    form().patchValue({ nombre: 'Postres y bebidas', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' });
    await chooseScope('CATEGORIAS');
    const boxes = html().querySelectorAll<HTMLInputElement>('[data-scope-panel="categorias"] input[type="checkbox"]');
    boxes[1].click();
    boxes[2].click();
    await tick();

    await submit();

    const request = httpMock.expectOne(`${BASE}/promociones`);
    expect(request.request.body).toMatchObject({
      alcance: 'CATEGORIAS',
      categoriaIds: [20, 30],
      productoIds: [],
    });
    request.flush({ ...PROMOTION, id: 9, alcance: 'CATEGORIAS' });
  });

  it('por categoría sin elegir ninguna avisa y no envía', async () => {
    await open(null);
    form().patchValue({ nombre: 'Vacía', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' });
    await chooseScope('CATEGORIAS');

    await submit();

    httpMock.expectNone(`${BASE}/promociones`);
    expect(html().textContent).toContain('Elegí al menos una categoría activa.');
  });

  it('«todos» explica que incluye los productos futuros y se envía sin productos ni categorías', async () => {
    await open(null);
    form().patchValue({ nombre: 'Todo', fechaInicio: '2026-11-01', fechaFin: '2026-11-30' });
    await chooseScope('TODOS');

    expect(html().querySelector('[data-scope-note="todos"]')!.textContent).toContain('agreguen más adelante');
    await submit();

    const request = httpMock.expectOne(`${BASE}/promociones`);
    expect(request.request.body).toMatchObject({ alcance: 'TODOS', categoriaIds: [], productoIds: [] });
    request.flush({ ...PROMOTION, id: 10, alcance: 'TODOS' });
  });

  it('al editar parte del alcance guardado y lo conserva al guardar', async () => {
    await open({ ...PROMOTION, alcance: 'CATEGORIAS', categoriaIds: [10], categorias: ['Panes'], productoIds: [] });

    const marcadas = html().querySelectorAll<HTMLInputElement>(
      '[data-scope-panel="categorias"] input:checked',
    );
    expect(marcadas).toHaveLength(1);

    await submit();

    const request = httpMock.expectOne(`${BASE}/promociones/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ alcance: 'CATEGORIAS', categoriaIds: [10] });
    request.flush({ ...PROMOTION, alcance: 'CATEGORIAS' });
  });

  it('una promoción sin alcance en la respuesta se edita como por productos', async () => {
    const { alcance: _alcance, ...vieja } = PROMOTION;
    await open(vieja as Promotion);

    expect(selectedCount()).toBe('1 seleccionado');
    await submit();

    const request = httpMock.expectOne(`${BASE}/promociones/7`);
    expect(request.request.body).toMatchObject({ alcance: 'PRODUCTOS', productoIds: [1] });
    request.flush(PROMOTION);
  });

  it('un producto que se desactivó no se ofrece ni se cuenta, pero la edición lo conserva', async () => {
    await open({ ...PROMOTION, productoIds: [1, 3] });

    expect(selectedCount()).toBe('1 seleccionado');
    expect(html().textContent).not.toContain('PRUEBA-MVEW5GZO');
    await submit();

    const request = httpMock.expectOne(`${BASE}/promociones/7`);
    expect(request.request.body).toMatchObject({ productoIds: [1, 3] });
    request.flush(PROMOTION);
  });

  it('muestra el error del backend junto al selector de productos', async () => {
    await open(PROMOTION);

    await submit();
    httpMock
      .expectOne(`${BASE}/promociones/7`)
      .flush(
        { message: 'Revisa los datos ingresados.', code: 'VALIDATION', errors: { productoIds: 'Elegí al menos un producto activo para la promoción.' } },
        { status: 422, statusText: 'Unprocessable Entity' },
      );
    await tick();

    const panel = html().querySelector('[data-scope-panel="productos"]')!;
    expect(panel.textContent).toContain('Elegí al menos un producto activo para la promoción.');
    expect(html().querySelector('[role="alert"].alert')).toBeNull();
  });
});
