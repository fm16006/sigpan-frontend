import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { ManagedCategory } from '../../../../core/models/category.model';
import { CategoryList } from './category-list';

const BASE = 'https://api.sigpan.test/api/v1';
const CONFIG: ApiConfig = { baseUrl: BASE, origin: 'https://api.sigpan.test', timeoutMs: 5000 };

const PAN: ManagedCategory = {
  id: 1,
  nombre: 'Pan dulce',
  descripcion: 'Conchas y cuernitos',
  activo: true,
  productos: 5,
  productosActivos: 4,
  combos: 0,
  combosActivos: 0,
};
const PROMOCIONES: ManagedCategory = {
  id: 2,
  nombre: 'Promociones',
  descripcion: null,
  activo: true,
  productos: 0,
  productosActivos: 0,
  combos: 3,
  combosActivos: 2,
};
const VIEJA: ManagedCategory = {
  id: 3,
  nombre: 'Temporada vieja',
  descripcion: null,
  activo: false,
  productos: 1,
  productosActivos: 0,
  combos: 0,
  combosActivos: 0,
};

describe('Pantalla de categorías', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<CategoryList>;

  const html = () => fixture.nativeElement as HTMLElement;
  const buttonByText = (root: ParentNode, text: string) =>
    Array.from(root.querySelectorAll('button')).find((b) => b.textContent?.trim().includes(text));

  /** No usa whenStable: con una petición pendiente (aún sin flush) nunca terminaría. */
  async function settle(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  /** Responde el listado pendiente y deja la pantalla estable. */
  async function load(list: ManagedCategory[] = [PAN, PROMOCIONES, VIEJA]): Promise<void> {
    fixture = TestBed.createComponent(CategoryList);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.expectOne(`${BASE}/categorias`).flush(list);
    await settle();
  }

  async function type(selector: string, value: string): Promise<void> {
    const input = html().querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista las categorías con cuántos productos y combos usa cada una, y su estado', async () => {
    await load();

    const text = html().textContent ?? '';
    expect(text).toContain('Inventario');
    expect(text).toContain('Pan dulce');
    expect(text).toContain('Conchas y cuernitos');
    // Una categoría que solo tiene combos aparece con su conteo.
    const rows = Array.from(html().querySelectorAll('.list-row'));
    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toMatch(/5/);
    expect(rows[1].textContent).toContain('Promociones');
    expect(rows[1].textContent).toMatch(/Combos\s*3/);
    expect(rows[2].textContent).toContain('Inactiva');
  });

  it('busca por nombre y filtra por activas e inactivas', async () => {
    await load();

    await type('input[type="search"]', 'promo');
    expect(html().querySelectorAll('.list-row')).toHaveLength(1);

    await type('input[type="search"]', '');
    buttonByText(html(), 'Inactivas')!.click();
    await settle();
    const rows = html().querySelectorAll('.list-row');
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('Temporada vieja');
  });

  it('crea una categoría con nombre y descripción y recarga la lista', async () => {
    await load();

    buttonByText(html(), 'Nueva categoría')!.click();
    await settle();
    await type('#cat-nombre', '  Bebidas  ');
    await type('#cat-descripcion', 'Café y jugos');
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    const request = httpMock.expectOne(`${BASE}/categorias`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ nombre: 'Bebidas', descripcion: 'Café y jugos' });
    request.flush({ ...PAN, id: 9, nombre: 'Bebidas' });
    await settle();

    // Tras guardar se vuelve a pedir el listado.
    httpMock.expectOne(`${BASE}/categorias`).flush([PAN, PROMOCIONES, VIEJA]);
    await settle();
    expect(html().querySelector('[role="dialog"]')).toBeNull();
  });

  it('exige el nombre y no envía nada si está vacío', async () => {
    await load();

    buttonByText(html(), 'Nueva categoría')!.click();
    await settle();
    await type('#cat-nombre', '   ');
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    httpMock.expectNone(`${BASE}/categorias`);
    expect(html().querySelector('[role="dialog"]')!.textContent).toContain('obligatorio');
  });

  it('muestra el error del nombre repetido en el campo y deja el panel abierto', async () => {
    await load();

    buttonByText(html(), 'Nueva categoría')!.click();
    await settle();
    await type('#cat-nombre', 'Pan dulce');
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();

    httpMock
      .expectOne(`${BASE}/categorias`)
      .flush(
        { message: 'Ya existe una categoría con el nombre Pan dulce', code: 'CONFLICT' },
        { status: 409, statusText: 'Conflict' },
      );
    await settle();

    const dialog = html().querySelector('[role="dialog"]')!;
    expect(dialog).not.toBeNull();
    expect(dialog.textContent).toContain('Ya existe una categoría con el nombre Pan dulce');
    expect(dialog.querySelector('#cat-nombre')!.classList).toContain('input-error');
  });

  it('desactivar pide confirmación, advierte cuántos productos y combos la usan y llama a DELETE', async () => {
    await load();

    html().querySelector<HTMLButtonElement>('[aria-label="Desactivar Pan dulce"]')!.click();
    await settle();

    const dialog = html().querySelector('[role="alertdialog"]')!;
    expect(dialog.textContent).toContain('«Pan dulce»');
    expect(dialog.textContent).toContain('4 productos activos');
    expect(dialog.textContent).toContain('No se borra');
    httpMock.expectNone(`${BASE}/categorias/1`);

    buttonByText(dialog, 'Desactivar')!.click();
    await settle();

    const request = httpMock.expectOne(`${BASE}/categorias/1`);
    expect(request.request.method).toBe('DELETE');
    request.flush(null);
    await settle();
    httpMock.expectOne(`${BASE}/categorias`).flush([{ ...PAN, activo: false }, PROMOCIONES, VIEJA]);
    await settle();
    expect(html().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('cancelar el diálogo no desactiva nada', async () => {
    await load();

    html().querySelector<HTMLButtonElement>('[aria-label="Desactivar Promociones"]')!.click();
    await settle();
    buttonByText(html().querySelector('[role="alertdialog"]')!, 'Cancelar')!.click();
    await settle();

    expect(html().querySelector('[role="alertdialog"]')).toBeNull();
    httpMock.expectNone(`${BASE}/categorias/2`);
  });

  it('reactiva una categoría inactiva con PATCH', async () => {
    await load();

    html().querySelector<HTMLButtonElement>('[aria-label="Reactivar Temporada vieja"]')!.click();
    await settle();
    buttonByText(html().querySelector('[role="alertdialog"]')!, 'Reactivar')!.click();
    await settle();

    const request = httpMock.expectOne(`${BASE}/categorias/3/activar`);
    expect(request.request.method).toBe('PATCH');
    request.flush({ ...VIEJA, activo: true });
    await settle();
    httpMock.expectOne(`${BASE}/categorias`).flush([PAN, PROMOCIONES, { ...VIEJA, activo: true }]);
    await settle();
  });
});
