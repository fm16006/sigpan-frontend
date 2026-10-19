import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { UserRole } from '../../../../core/models/user.model';
import { Notifications } from '../../../../core/services/notifications';
import { SessionStore } from '../../../../core/services/session-store';
import { ProductDetail } from './product-detail';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

function product(overrides: Partial<CatalogProduct> = {}): CatalogProduct {
  return {
    id: 0,
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
    ...overrides,
  };
}

describe('Ficha del producto: canales de venta', () => {
  let httpMock: HttpTestingController;
  let notifications: Notifications;

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
    notifications = TestBed.inject(Notifications);
  });

  afterEach(() => {
    // Las demás pestañas piden sus datos; aquí solo importa el producto y el PATCH.
    httpMock.match(() => true);
  });

  async function open(role: UserRole, data: CatalogProduct): Promise<ComponentFixture<ProductDetail>> {
    TestBed.inject(SessionStore).set({
      accessToken: 't',
      expiresIn: 900,
      user: { id: 1, name: 'Ana', email: 'ana@sigpan.test', role, sucursalId: 1, sucursal: 'Principal' },
    });
    const fixture = TestBed.createComponent(ProductDetail);
    fixture.detectChanges();
    TestBed.tick();
    // El producto con sus datos; todo lo demás que pide la ficha (receta, precios…) llega vacío.
    for (const req of httpMock.match(() => true)) {
      const isProduct = req.request.method === 'GET' && /\/productos\/0(\?|$)/.test(req.request.url);
      req.flush(isProduct ? data : []);
    }
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture;
  }

  function switches(fixture: ComponentFixture<ProductDetail>) {
    const root = fixture.nativeElement as HTMLElement;
    return {
      pos: root.querySelector<HTMLInputElement>('input[data-channel="disponiblePos"]')!,
      tienda: root.querySelector<HTMLInputElement>('input[data-channel="disponibleTienda"]')!,
      text: root.textContent ?? '',
    };
  }

  function patchRequest(): TestRequest {
    return httpMock.expectOne(
      (req) => req.method === 'PATCH' && req.url === `${CONFIG.baseUrl}/productos/0/canales`,
    );
  }

  it('muestra dos interruptores con etiqueta, reflejando el estado de cada canal', async () => {
    const fixture = await open('ADMINISTRADOR', product({ disponiblePos: false }));
    const { pos, tienda, text } = switches(fixture);

    expect(text).toContain('Punto de venta');
    expect(text).toContain('Tienda en línea');
    expect(pos.checked).toBe(false);
    expect(tienda.checked).toBe(true);
    expect(pos.disabled).toBe(false);
  });

  it('al cambiar un interruptor llama al PATCH con solo ese canal y avisa el éxito', async () => {
    const fixture = await open('JEFE_PRODUCCION', product());
    const { tienda } = switches(fixture);

    tienda.checked = false;
    tienda.dispatchEvent(new Event('change'));

    const request = patchRequest();
    expect(request.request.body).toEqual({ disponibleTienda: false });
    // Actualización optimista: ya está apagado y quieto mientras responde el backend.
    fixture.detectChanges();
    expect(switches(fixture).tienda.checked).toBe(false);
    expect(switches(fixture).tienda.disabled).toBe(true);

    request.flush(product({ disponibleTienda: false }));
    fixture.detectChanges();

    expect(switches(fixture).tienda.disabled).toBe(false);
    expect(switches(fixture).tienda.checked).toBe(false);
    expect(notifications.notices().map((n) => n.kind)).toEqual(['success']);
    expect(notifications.notices()[0].text).toContain('Tienda en línea');
  });

  it('si el backend falla, vuelve al valor anterior', async () => {
    const fixture = await open('ADMINISTRADOR', product());
    const { pos } = switches(fixture);

    pos.checked = false;
    pos.dispatchEvent(new Event('change'));
    fixture.detectChanges();
    expect(switches(fixture).pos.checked).toBe(false);
    patchRequest().flush({ mensaje: 'Error' }, { status: 500, statusText: 'Server Error' });
    fixture.detectChanges();

    expect(switches(fixture).pos.checked).toBe(true);
    expect(switches(fixture).pos.disabled).toBe(false);
    expect(notifications.notices().filter((n) => n.kind === 'success')).toHaveLength(0);
  });

  it('un rol sin permiso para editar los ve deshabilitados', async () => {
    const fixture = await open('BODEGUERO', product());
    const { pos, tienda } = switches(fixture);

    expect(pos.disabled).toBe(true);
    expect(tienda.disabled).toBe(true);
  });

  it('un producto inactivo tiene los interruptores deshabilitados', async () => {
    const fixture = await open('ADMINISTRADOR', product({ activo: false }));
    const { pos, tienda } = switches(fixture);

    expect(pos.disabled).toBe(true);
    expect(tienda.disabled).toBe(true);
  });
});
