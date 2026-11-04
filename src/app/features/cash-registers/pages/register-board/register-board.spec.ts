import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CashShift, RegisterStatus } from '../../../../core/models/order.model';
import { Auth } from '../../../../core/services/auth';
import { RegisterBoard } from './register-board';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const CAJAS = 'https://api.sigpan.test/api/v1/turnos/cajas';

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
