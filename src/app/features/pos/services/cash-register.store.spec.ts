import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../core/config/api.config';
import { CashShift } from '../../../core/models/order.model';
import { AuthSession } from '../../../core/models/user.model';
import { SessionStore } from '../../../core/services/session-store';
import { CashRegisterStore } from './cash-register.store';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const BASE = CONFIG.baseUrl;

const SESSION: AuthSession = {
  accessToken: 't',
  expiresIn: 900,
  user: { id: 7, name: 'Ana Cajera', email: 'ana@sigpan.test', role: 'CAJERO' },
};

function shift(overrides: Partial<CashShift> = {}): CashShift {
  return {
    id: 3,
    cajaId: 1,
    caja: 'Caja 1',
    usuarioId: 7,
    usuario: 'Ana Cajera',
    estado: 'ABIERTO',
    apertura: '2026-10-29T08:00:00',
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
    ...overrides,
  };
}

describe('CashRegisterStore (HU-38)', () => {
  let store: CashRegisterStore;
  let http: HttpTestingController;

  function answerStartup(actual: CashShift | null, today: CashShift[] = []): void {
    TestBed.tick();
    http.expectOne(`${BASE}/turnos/actual`).flush(actual);
    http.expectOne((r) => r.url === `${BASE}/turnos`).flush(today);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(SessionStore).set(SESSION);
    store = TestBed.inject(CashRegisterStore);
  });

  afterEach(() => http.verify());

  it('sin turno en el servidor queda cerrada', () => {
    answerStartup(null);

    expect(store.estado()).toBe('cerrada');
    expect(store.turno()).toBeNull();
  });

  it('toma el turno abierto del servidor con su esperado', () => {
    answerStartup(shift());

    expect(store.estado()).toBe('abierta');
    expect(store.turno()?.fondo).toBe(20);
    expect(store.turno()?.esperado).toBe(30);
    expect(store.lugar()?.caja).toBe('Caja 1');
  });

  it('abrir envía la caja y el fondo', () => {
    answerStartup(null);

    store.abrir(45.5, '', { cajaId: 1, caja: 'Caja 1' }).subscribe();
    const req = http.expectOne(`${BASE}/turnos/abrir`);
    expect(req.request.body).toEqual({ cajaId: 1, fondoInicial: 45.5 });
    req.flush(shift({ fondoInicial: 45.5 }));

    expect(store.estado()).toBe('abierta');
  });

  it('cerrar envía lo contado y guarda la diferencia del servidor', () => {
    answerStartup(shift());

    store.cerrar(28).subscribe();
    const req = http.expectOne(`${BASE}/turnos/3/cerrar`);
    expect(req.request.body.efectivoContado).toBe(28);
    req.flush(shift({ estado: 'CERRADO', cierre: '2026-10-29T16:00:00', efectivoContado: 28, diferencia: -2 }));

    expect(store.estado()).toBe('cerrada');
    expect(store.ultimoCierre()?.diferencia).toBe(-2);
    expect(store.ultimoCierre()?.contado).toBe(28);
  });
});
