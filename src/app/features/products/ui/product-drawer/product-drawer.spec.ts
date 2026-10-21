import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { SessionStore } from '../../../../core/services/session-store';
import { ProductDrawer } from './product-drawer';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

const PRODUCT: CatalogProduct = {
  id: 7,
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
  tipo: 'ELABORADO',
  disponiblePos: true,
  disponibleTienda: true,
  exentoIva: false,
};

describe('Formulario de producto: exento de IVA (HU-36)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<ProductDrawer>;

  async function open(product: CatalogProduct | null): Promise<void> {
    TestBed.inject(SessionStore).set({
      accessToken: 't',
      expiresIn: 900,
      user: { id: 1, name: 'Ana', email: 'ana@sigpan.test', role: 'ADMINISTRADOR' },
    });
    fixture = TestBed.createComponent(ProductDrawer);
    fixture.componentRef.setInput('product', product);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    // El desplegable de categorías pide su lista al abrirse; whenStable espera esa respuesta.
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.match(() => true).forEach((req) => req.flush([{ id: 1, nombre: 'Pan dulce' }]));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
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

  const html = () => fixture.nativeElement as HTMLElement;
  const confirm = () => html().querySelector('[role="alertdialog"]');
  const exempt = () => html().querySelector<HTMLInputElement>('[formcontrolname="exentoIva"]')!;

  async function submit(): Promise<void> {
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function toggleExempt(value: boolean): void {
    exempt().checked = value;
    exempt().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('ofrece la casilla «Exento de IVA», apagada en un producto nuevo', async () => {
    await open(null);

    expect(html().textContent).toContain('Exento de IVA');
    expect(exempt().checked).toBe(false);
  });

  it('un producto nuevo se guarda sin pedir confirmación aunque se marque exento', async () => {
    await open(null);
    toggleExempt(true);
    const form = (fixture.componentInstance as unknown as { form: { patchValue(v: object): void } }).form;
    form.patchValue({ codigo: 'NV-1', nombre: 'Nuevo', precio: 1, categoriaId: 1, unidadVenta: 'unidad', especialidad: 'PAN_DULCE' });

    await submit();

    expect(confirm()).toBeNull();
    const request = httpMock.expectOne('https://api.sigpan.test/api/v1/productos');
    expect(request.request.body).toMatchObject({ exentoIva: true });
    request.flush({ ...PRODUCT, exentoIva: true });
  });

  it('al cambiar la exención de un producto existente pide confirmación y no guarda hasta aceptar', async () => {
    await open(PRODUCT);
    toggleExempt(true);

    await submit();

    httpMock.expectNone('https://api.sigpan.test/api/v1/productos/7');
    expect(confirm()!.textContent).toContain('se venderá sin IVA');
    expect(confirm()!.textContent).toContain('ya registrados no cambian');

    Array.from(confirm()!.querySelectorAll('button')).find((b) => b.textContent?.includes('Aplicar cambio'))!.click();
    fixture.detectChanges();

    const request = httpMock.expectOne('https://api.sigpan.test/api/v1/productos/7');
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ exentoIva: true });
    request.flush({ ...PRODUCT, exentoIva: true });
  });

  it('si no cambia la exención se guarda directo', async () => {
    await open({ ...PRODUCT, exentoIva: true });
    expect(exempt().checked).toBe(true);

    await submit();

    expect(confirm()).toBeNull();
    const request = httpMock.expectOne('https://api.sigpan.test/api/v1/productos/7');
    expect(request.request.body).toMatchObject({ exentoIva: true });
    request.flush({ ...PRODUCT, exentoIva: true });
  });

  it('cancelar la confirmación no guarda', async () => {
    await open({ ...PRODUCT, exentoIva: true });
    toggleExempt(false);

    await submit();
    expect(confirm()!.textContent).toContain('volverá a llevar IVA');
    Array.from(confirm()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Cancelar')!.click();
    fixture.detectChanges();

    expect(confirm()).toBeNull();
    httpMock.expectNone('https://api.sigpan.test/api/v1/productos/7');
  });
});
