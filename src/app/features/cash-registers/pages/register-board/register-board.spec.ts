import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { RegisterAdmin } from '../../../../core/models/branch.model';
import { CashShift, RegisterStatus } from '../../../../core/models/order.model';
import { Auth } from '../../../../core/services/auth';
import { RegisterBoard } from './register-board';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const CAJAS = 'https://api.sigpan.test/api/v1/turnos/cajas';
const ADMIN_CAJAS = 'https://api.sigpan.test/api/v1/cajas';
const ADMIN_LIST: RegisterAdmin[] = [
  { id: 10, nombre: 'Caja 01', codigo: 'C01', activo: true, ocupada: true, turnoId: 3, usuario: 'Ana' },
  { id: 11, nombre: 'Caja 02', codigo: 'C02', activo: true, ocupada: false, turnoId: null, usuario: null },
  { id: 12, nombre: 'Caja 03', codigo: 'C03', activo: false, ocupada: false, turnoId: null, usuario: null },
];

const SHIFT: CashShift = {
  id: 3,
  cajaId: 10,
  caja: 'Caja 01',
  usuarioId: 7,
  usuario: 'Ana',
  estado: 'ABIERTO',
  apertura: '2026-11-02T07:30:00',
  fondoInicial: 20,
  cierre: null,
  cantidadVentas: 2,
  totalVentas: 15,
  efectivoVentas: 10,
  tarjetaVentas: 5,
  efectivoEsperado: 30,
  efectivoContado: null,
  diferencia: null,
  observacion: null,
};

const STATUSES: RegisterStatus[] = [
  {
    cajaId: 10,
    caja: 'Caja 01',
    codigo: 'C01',
    ocupada: true,
    turnoId: 3,
    usuarioId: 7,
    usuario: 'Ana',
    apertura: SHIFT.apertura,
    turno: SHIFT,
  },
  {
    cajaId: 11,
    caja: 'Caja 02',
    codigo: 'C02',
    ocupada: false,
    turnoId: null,
    usuarioId: null,
    usuario: null,
    apertura: null,
    turno: null,
  },
];

describe('Punto de venta · pestaña Cajas (HU-68)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<RegisterBoard>;

  async function render(isAdmin: boolean): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: CONFIG },
        { provide: Auth, useValue: { hasAnyRole: () => isAdmin } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(RegisterBoard);
    fixture.detectChanges();
    httpMock.expectOne(CAJAS).flush(STATUSES);
    if (isAdmin) httpMock.expectOne(ADMIN_CAJAS).flush(ADMIN_LIST);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => httpMock.verify());

  it('muestra quién ocupa cada caja, desde cuándo y avisa si el turno viene de otro día', async () => {
    const root = await render(true);
    const cards = [...root.querySelectorAll('app-register-card')];

    expect(cards).toHaveLength(2);
    expect(cards[0].textContent).toContain('Ocupada');
    expect(cards[0].textContent).toContain('Ana');
    expect(cards[0].textContent).toContain('turno #3');
    expect(cards[0].textContent).toContain('viene de otro día');
    expect(cards[1].textContent).toContain('Libre');
  });

  it('solo el administrador ve el botón para cerrar el turno', async () => {
    const root = await render(false);
    expect(root.textContent).not.toContain('Cerrar este turno');
    expect(root.querySelector('app-register-admin')).toBeNull();
  });

  it('el administrador ve todas las cajas y no puede quitar la que está en uso', async () => {
    const root = await render(true);
    const rows = [...root.querySelectorAll('app-register-admin li')];

    expect(rows).toHaveLength(3);
    expect(rows[0].textContent).toContain('En uso · Ana');
    expect(rows[1].textContent).toContain('Libre');
    expect(rows[2].textContent).toContain('Quitada');
    const quitar = (row: Element) =>
      [...row.querySelectorAll('button')].find((b) => b.textContent?.includes('Quitar')) as HTMLButtonElement;
    expect(quitar(rows[0]).disabled).toBe(true);
    expect(quitar(rows[1]).disabled).toBe(false);
  });

  it('el administrador agrega una caja con el nombre sugerido', async () => {
    const root = await render(true);
    root.querySelector<HTMLFormElement>('app-register-admin form')!.dispatchEvent(new Event('submit'));

    const request = httpMock.expectOne((r) => r.method === 'POST' && r.url === ADMIN_CAJAS);
    expect(request.request.body).toEqual({ nombre: 'Caja 04' });
    request.flush({ id: 13, nombre: 'Caja 04', codigo: 'C04', activo: true, ocupada: false, turnoId: null, usuario: null });
    // Tras agregar, el panel y el tablero vuelven a leer las cajas.
    fixture.detectChanges();
    httpMock.expectOne((r) => r.method === 'GET' && r.url === ADMIN_CAJAS).flush(ADMIN_LIST);
    httpMock.expectOne(CAJAS).flush(STATUSES);
  });

  it('el administrador cierra el turno de otro cajero con el efectivo contado', async () => {
    const root = await render(true);
    const button = [...root.querySelectorAll('button')].find((b) => b.textContent?.includes('Cerrar este turno'));
    button!.click();
    fixture.detectChanges();

    const input = root.querySelector<HTMLInputElement>('#close-contado')!;
    input.value = '29.5';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(root.textContent).toContain('(faltante)');

    root.querySelector<HTMLFormElement>('#close-shift-form')!.dispatchEvent(new Event('submit'));
    const request = httpMock.expectOne('https://api.sigpan.test/api/v1/turnos/3/cerrar');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ efectivoContado: 29.5, observacion: undefined });
    request.flush({ ...SHIFT, estado: 'CERRADO', cierre: '2026-11-03T17:00:00' });
    TestBed.tick();
    expect(root.querySelector('#close-shift-form')).toBeNull();
    httpMock.expectOne(CAJAS).flush([{ ...STATUSES[0], ocupada: false, turno: null }, STATUSES[1]]);
  });
});
