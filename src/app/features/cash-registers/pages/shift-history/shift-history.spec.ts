import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, TestRequest, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { Page } from '../../../../core/models/api.model';
import { CashShift } from '../../../../core/models/order.model';
import { ShiftHistory } from './shift-history';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const API = 'https://api.sigpan.test/api/v1';

const SHIFT: CashShift = {
  id: 4,
  cajaId: 10,
  caja: 'Caja 01',
  usuarioId: 7,
  usuario: 'Ana',
  estado: 'CERRADO',
  apertura: '2026-11-01T16:22:00',
  fondoInicial: 60,
  cierre: '2026-11-03T18:00:00',
  cantidadVentas: 1,
  totalVentas: 2,
  efectivoVentas: 2,
  tarjetaVentas: 0,
  efectivoEsperado: 62,
  efectivoContado: 61.5,
  diferencia: -0.5,
  observacion: 'Lo cerró la administración',
  cerradoPor: 'Admin',
};

function page(content: CashShift[]): Page<CashShift> {
  return { content, page: 0, size: 20, totalElements: content.length, totalPages: content.length ? 1 : 0 };
}

describe('Punto de venta · pestaña Cortes (HU-68)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<ShiftHistory>;

  function history(): TestRequest {
    return httpMock.expectOne((request) => request.url.startsWith(`${API}/turnos/historial?`));
  }

  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ShiftHistory);
    fixture.detectChanges();
    httpMock.expectOne(`${API}/turnos/cajas`).flush([]);
    httpMock.expectOne(`${API}/turnos/cajeros?soloLibres=false`).flush([{ id: 7, nombre: 'Ana', rol: 'CAJERO' }]);
    return fixture.nativeElement as HTMLElement;
  }

  /** api.url arma la consulta dentro de la URL, no en HttpParams. */
  function params(request: TestRequest): URLSearchParams {
    return new URL(request.request.url).searchParams;
  }

  afterEach(() => httpMock.verify());

  it('pide los cortes de la última semana y muestra la diferencia', async () => {
    const root = await render();
    const request = history();
    expect(params(request).get('pagina')).toBe('0');
    expect(params(request).get('desde')).toBeTruthy();
    expect(params(request).has('soloConDiferencia')).toBe(false);
    request.flush(page([SHIFT]));
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('Caja 01');
    expect(root.textContent).toContain('Ana');
    expect(root.textContent).toContain('Faltante');
    expect(root.textContent).toContain('1 corte(s)');
  });

  it('filtra solo los que no cuadraron', async () => {
    const root = await render();
    history().flush(page([SHIFT]));
    await fixture.whenStable();
    fixture.detectChanges();

    root.querySelector<HTMLInputElement>('input[type="checkbox"]')!.dispatchEvent(new Event('change'));
    TestBed.tick();
    const filtered = history();
    expect(params(filtered).get('soloConDiferencia')).toBe('true');
    expect(params(filtered).get('pagina')).toBe('0');
    filtered.flush(page([]));
  });

  it('al abrir un corte muestra quién lo cerró y sus ventas, también las anuladas', async () => {
    const root = await render();
    history().flush(page([SHIFT]));
    await fixture.whenStable();
    fixture.detectChanges();

    root.querySelector<HTMLButtonElement>('button[aria-label="Ver el corte del turno 4"]')!.click();
    TestBed.tick();
    httpMock.expectOne(`${API}/turnos/4/ventas`).flush([
      { id: 31, usuarioId: 7, usuario: 'Ana', tipo: 'MOSTRADOR', estado: 'ANULADA', fecha: '2026-11-01T17:00:00',
        subtotal: 2, descuento: 0, total: 2, metodoPago: 'EFECTIVO' },
    ]);
    await fixture.whenStable();
    fixture.detectChanges();

    expect(root.textContent).toContain('Lo cerró');
    expect(root.textContent).toContain('Admin');
    expect(root.textContent).toContain('#31');
    expect(root.textContent).toContain('Anulada');
  });
});
