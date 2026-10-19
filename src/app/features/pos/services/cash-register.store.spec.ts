import { TestBed } from '@angular/core/testing';
import { AuthSession } from '../../../core/models/user.model';
import { SessionStore } from '../../../core/services/session-store';
import { CashRegisterStore } from './cash-register.store';

function session(id: number, email: string, name = 'Ana Cajera'): AuthSession {
  return { accessToken: 't', expiresIn: 900, user: { id, name, email, role: 'CAJERO' } };
}

/** Un store nuevo sobre el mismo localStorage, como al recargar la página. */
function reload(): { store: CashRegisterStore; sessionStore: SessionStore } {
  TestBed.resetTestingModule();
  return { store: TestBed.inject(CashRegisterStore), sessionStore: TestBed.inject(SessionStore) };
}

describe('CashRegisterStore', () => {
  let store: CashRegisterStore;
  let sessionStore: SessionStore;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
    sessionStore = TestBed.inject(SessionStore);
    sessionStore.set(session(7, 'ana@sigpan.test'));
    store = TestBed.inject(CashRegisterStore);
  });

  it('arranca cerrada y sin turno', () => {
    expect(store.estado()).toBe('cerrada');
    expect(store.turno()).toBeNull();
    expect(store.ultimoCierre()).toBeNull();
  });

  it('abrir deja el turno con fondo, nota y cajero', () => {
    store.abrir(45.5, '  fondo de Luis ');

    expect(store.estado()).toBe('abierta');
    const turno = store.turno();
    expect(turno?.fondo).toBe(45.5);
    expect(turno?.nota).toBe('fondo de Luis');
    expect(turno?.cajero).toBe('Ana Cajera');
    expect(Number.isNaN(Date.parse(turno?.abiertaEn ?? ''))).toBe(false);
  });

  it('no reabre un turno que ya está abierto', () => {
    store.abrir(10, '');
    const first = store.turno();
    store.abrir(99, 'otro');

    expect(store.turno()).toBe(first);
  });

  it('cerrar vuelve a cerrada y guarda el último cierre', () => {
    store.abrir(20, 'nota');
    store.cerrar(135.25);

    expect(store.estado()).toBe('cerrada');
    expect(store.turno()).toBeNull();
    const cierre = store.ultimoCierre();
    expect(cierre?.fondo).toBe(20);
    expect(cierre?.contado).toBe(135.25);
    expect(cierre?.nota).toBe('nota');
    expect(Number.isNaN(Date.parse(cierre?.cerradaEn ?? ''))).toBe(false);
  });

  it('cerrar sin turno abierto no hace nada', () => {
    store.cerrar(10);

    expect(store.estado()).toBe('cerrada');
    expect(store.ultimoCierre()).toBeNull();
  });

  it('guarda en la llave del usuario y se recupera al recargar', () => {
    store.abrir(30, '');
    expect(localStorage.getItem('sigpan.caja.7')).toContain('"fondo":30');

    const again = reload();
    again.sessionStore.set(session(7, 'ana@sigpan.test'));

    expect(again.store.estado()).toBe('abierta');
    expect(again.store.turno()?.fondo).toBe(30);
  });

  it('cada usuario tiene su propia caja', () => {
    store.abrir(30, '');

    sessionStore.set(session(8, 'luis@sigpan.test', 'Luis'));
    expect(store.estado()).toBe('cerrada');

    sessionStore.set(session(7, 'ana@sigpan.test'));
    expect(store.estado()).toBe('abierta');
  });

  it('ignora un valor corrupto en localStorage', () => {
    localStorage.setItem('sigpan.caja.7', '{no es json');
    const again = reload();
    again.sessionStore.set(session(7, 'ana@sigpan.test'));

    expect(again.store.estado()).toBe('cerrada');
  });

  it('ignora un turno con forma inválida', () => {
    localStorage.setItem('sigpan.caja.7', JSON.stringify({ turno: { fondo: 'mucho' } }));
    const again = reload();
    again.sessionStore.set(session(7, 'ana@sigpan.test'));

    expect(again.store.turno()).toBeNull();
  });

  it('abrir guarda la sucursal y la caja elegidas, y sobreviven a una recarga', () => {
    const lugar = { sucursalId: 1, sucursal: 'Principal', cajaId: 11, caja: 'Caja 02' };
    store.abrir(30, '', lugar);

    expect(store.lugar()).toEqual(lugar);

    const again = reload();
    again.sessionStore.set(session(7, 'ana@sigpan.test'));
    expect(again.store.lugar()).toEqual(lugar);

    again.store.cerrar(30);
    expect(again.store.lugar()).toBeNull();
    expect(again.store.ultimoCierre()?.lugar).toEqual(lugar);
  });

  it('un turno guardado antes de HU-60, sin caja, sigue siendo válido', () => {
    store.abrir(10, '');

    expect(store.estado()).toBe('abierta');
    expect(store.lugar()).toBeNull();
  });

  it('descarta una caja guardada con forma inválida sin perder el turno', () => {
    localStorage.setItem(
      'sigpan.caja.7',
      JSON.stringify({
        turno: {
          abiertaEn: '2026-10-19T10:00:00.000Z',
          fondo: 5,
          nota: '',
          cajero: 'Ana',
          lugar: { sucursal: 7 },
        },
      }),
    );
    const again = reload();
    again.sessionStore.set(session(7, 'ana@sigpan.test'));

    expect(again.store.estado()).toBe('abierta');
    expect(again.store.lugar()).toBeNull();
  });

  it('sigue funcionando en memoria si localStorage falla', () => {
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('cuota llena');
    });

    expect(() => store.abrir(5, '')).not.toThrow();
    expect(store.estado()).toBe('abierta');
    spy.mockRestore();
  });
});
