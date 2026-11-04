import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { Page } from '../../../../core/models/api.model';
import { SaleSummary } from '../../../../core/models/order.model';
import { SalesHistory } from './sales-history';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const API = 'https://api.sigpan.test/api/v1';

const SALE: SaleSummary = {
  id: 31,
  tipo: 'MOSTRADOR',
  estado: 'ANULADA',
  fecha: '2026-11-01T17:05:00',
  total: 2.5,
  metodoPago: 'EFECTIVO',
  cajaId: 10,
  caja: 'Caja 01',
  turnoId: 4,
  cajero: 'Ana',
  cliente: null,
  modalidad: null,
  encargo: false,
  numeroControl: null,
};

function page(content: SaleSummary[]): Page<SaleSummary> {
  return { content, page: 0, size: 25, totalElements: content.length, totalPages: content.length ? 1 : 0 };
}

describe('Punto de venta · pestaña Ventas y pedidos (HU-69)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<SalesHistory>;

  function history(): TestRequest {
    return httpMock.expectOne((request) => request.url.startsWith(`${API}/ventas/historial?`));
  }

  function params(request: TestRequest): URLSearchParams {
    return new URL(request.request.url).searchParams;
  }

  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(SalesHistory);
    fixture.detectChanges();
    httpMock.expectOne(`${API}/turnos/cajas`).flush([]);
    httpMock.expectOne(`${API}/turnos/cajeros?soloLibres=false`).flush([]);
    // Cualquier otra lectura compartida (por ejemplo, la empresa del ticket) no interesa acá.
    httpMock.match((request) => !request.url.includes('/ventas/historial')).forEach((request) => request.flush({}));
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => httpMock.verify());

  it('pide la última semana, primera página, y lista quién y el estado', async () => {
    const root = await render();
    const request = history();
    expect(params(request).get('pagina')).toBe('0');
    expect(params(request).get('desde')).toBeTruthy();
    expect(params(request).has('tipo')).toBe(false);
    request.flush(page([SALE]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('#31');
    expect(root.textContent).toContain('Ana');
    expect(root.textContent).toContain('Anulada');
    expect(root.textContent).toContain('1 venta(s)');
  });

  it('el canal filtra en el servidor y vuelve a la primera página', async () => {
    const root = await render();
    history().flush(page([SALE]));
    await fixture.whenStable();
    fixture.detectChanges();

    const select = root.querySelector<HTMLSelectElement>('select[aria-label="Canal"]')!;
    select.value = 'EN_LINEA';
    select.dispatchEvent(new Event('change'));
    TestBed.tick();
    const filtered = history();
    expect(params(filtered).get('tipo')).toBe('EN_LINEA');
    expect(params(filtered).get('pagina')).toBe('0');
    filtered.flush(page([]));
  });

  it('el detalle dice quién anuló y quién autorizó, y ofrece reimprimir el ticket', async () => {
    const root = await render();
    history().flush(page([SALE]));
    await fixture.whenStable();
    fixture.detectChanges();

    root.querySelector<HTMLButtonElement>('button[aria-label="Ver la venta 31"]')!.click();
    TestBed.tick();
    httpMock.expectOne(`${API}/ventas/31/consulta`).flush({
      ...SALE,
      usuarioId: 7,
      usuario: 'Ana',
      subtotal: 2.5,
      descuento: 0,
      motivoAnulacion: 'Cobro duplicado',
      fechaAnulacion: '2026-11-01T17:30:00',
      anuladaPor: 'Ana',
      autorizadaPor: 'Admin',
      detalles: [{ id: 1, productoId: 3, producto: 'Pan de agua', cantidad: 5, precio: 0.5, descuento: 0, subtotal: 2.5 }],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('Cobro duplicado');
    expect(root.textContent).toContain('La autorizó Admin');
    expect(root.textContent).toContain('Pan de agua');
    expect(root.textContent).toContain('Reimprimir ticket');
  });
});
