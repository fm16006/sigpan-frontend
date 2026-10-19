import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { Combo } from '../../../../core/models/combo.model';
import { ComboFormDrawer } from './combo-form-drawer';

const BASE = 'https://api.sigpan.test/api/v1';
const CONFIG: ApiConfig = { baseUrl: BASE, origin: 'https://api.sigpan.test', timeoutMs: 5000 };

const CATEGORIES = [
  { id: 1, nombre: 'Pan dulce', activo: true },
  { id: 2, nombre: 'Promociones', activo: true },
  { id: 3, nombre: 'Temporada vieja', activo: false },
];

const COMBO: Combo = {
  id: 7,
  nombre: 'Desayuno',
  descripcion: null,
  precio: 1.5,
  activo: true,
  categoriaId: 2,
  categoria: 'Promociones',
};

describe('Formulario de combo: categoría', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<ComboFormDrawer>;

  const html = () => fixture.nativeElement as HTMLElement;
  const select = () => html().querySelector<HTMLSelectElement>('#comboCategoria')!;
  const optionLabels = () => Array.from(select().options).map((o) => o.textContent?.trim());

  async function tick(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function open(combo: Combo | null): Promise<void> {
    fixture = TestBed.createComponent(ComboFormDrawer);
    fixture.componentRef.setInput('combo', combo);
    fixture.componentRef.setInput('open', true);
    await tick();
    httpMock.expectOne(`${BASE}/categorias`).flush(CATEGORIES);
    await tick();
  }

  async function submit(): Promise<void> {
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    await tick();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('ofrece solo las categorías activas, más la opción sin categoría', async () => {
    await open(null);

    expect(optionLabels()).toEqual(['Sin categoría (aparece en «Combos»)', 'Pan dulce', 'Promociones']);
    expect(html().textContent).toContain('Administrar categorías');
  });

  it('un combo nuevo sin categoría se guarda con categoriaId null', async () => {
    await open(null);
    const form = (fixture.componentInstance as unknown as { form: { patchValue(v: object): void } }).form;
    form.patchValue({ nombre: 'Combo nuevo', precio: 2 });

    await submit();

    const request = httpMock.expectOne(`${BASE}/combos`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toMatchObject({ nombre: 'Combo nuevo', categoriaId: null });
    request.flush({ ...COMBO, id: 8, categoriaId: null, categoria: null });
  });

  it('envía la categoría elegida al crear', async () => {
    await open(null);
    const form = (fixture.componentInstance as unknown as { form: { patchValue(v: object): void } }).form;
    form.patchValue({ nombre: 'Combo del mes', precio: 2, categoriaId: 2 });

    await submit();

    const request = httpMock.expectOne(`${BASE}/combos`);
    expect(request.request.body).toMatchObject({ nombre: 'Combo del mes', categoriaId: 2 });
    request.flush({ ...COMBO, id: 9 });
  });

  it('al editar parte de la categoría del combo y deja cambiarla o quitarla', async () => {
    await open(COMBO);

    expect(select().selectedOptions[0].textContent?.trim()).toBe('Promociones');

    select().value = select().options[0].value;
    select().dispatchEvent(new Event('change'));
    await submit();

    const request = httpMock.expectOne(`${BASE}/combos/7`);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ categoriaId: null });
    request.flush({ ...COMBO, categoriaId: null, categoria: null });
  });

  it('conserva en la lista la categoría del combo aunque esté desactivada', async () => {
    await open({ ...COMBO, categoriaId: 3, categoria: 'Temporada vieja' });

    expect(optionLabels()).toContain('Temporada vieja (inactiva)');
    expect(select().selectedOptions[0].textContent).toContain('Temporada vieja');
  });
});
