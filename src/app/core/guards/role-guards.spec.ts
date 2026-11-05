import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserRole } from '../models/user.model';
import { SessionStore } from '../services/session-store';
import { publicSiteGuard } from './public-site-guard';
import { roleGuard } from './role-guard';
import { roleHomeGuard } from './role-home-guard';

describe('guards por rol', () => {
  let session: SessionStore;
  let router: Router;

  const route = {} as ActivatedRouteSnapshot;
  const state = { url: '/' } as RouterStateSnapshot;

  function loginAs(role: UserRole): void {
    session.set({
      accessToken: 'token',
      expiresIn: 1800,
      user: { id: 1, name: 'Prueba', email: 'prueba@sigpan.test', role },
    });
  }

  function run(guard: typeof publicSiteGuard): boolean | string {
    const result = TestBed.runInInjectionContext(() => guard(route, state));
    return result instanceof UrlTree ? router.serializeUrl(result) : (result as boolean);
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    session = TestBed.inject(SessionStore);
    router = TestBed.inject(Router);
  });

  it('sin sesión se puede ver el sitio público', () => {
    session.clear();
    expect(run(publicSiteGuard)).toBe(true);
  });

  it('el cliente y el administrador ven el sitio público', () => {
    loginAs('CLIENTE');
    expect(run(publicSiteGuard)).toBe(true);
    loginAs('ADMINISTRADOR');
    expect(run(publicSiteGuard)).toBe(true);
  });

  it('el cajero no ve el sitio público y va al punto de venta', () => {
    loginAs('CAJERO');
    expect(run(publicSiteGuard)).toBe('/backoffice/pos');
  });

  it('el despachador va a la cola de pedidos', () => {
    loginAs('DESPACHADOR');
    expect(run(publicSiteGuard)).toBe('/backoffice/orders');
  });

  it('el panel general es solo del administrador', () => {
    loginAs('ADMINISTRADOR');
    expect(run(roleHomeGuard)).toBe(true);
    loginAs('BODEGUERO');
    expect(run(roleHomeGuard)).toBe('/backoffice/inventory');
  });

  it('roleGuard deja pasar los roles permitidos y manda al resto a su inicio', () => {
    loginAs('CAJERO');
    expect(run(roleGuard(['ADMINISTRADOR', 'CAJERO']))).toBe(true);
    expect(run(roleGuard(['ADMINISTRADOR']))).toBe('/backoffice/pos');
    loginAs('BODEGUERO');
    expect(run(roleGuard(['ADMINISTRADOR']))).toBe('/backoffice/inventory');
  });

  it('roleGuard manda a sin-permisos si el propio inicio le es ajeno (sin bucle)', () => {
    loginAs('CAJERO');
    const atHome = { url: '/backoffice/pos' } as RouterStateSnapshot;
    const result = TestBed.runInInjectionContext(() => roleGuard(['ADMINISTRADOR'])(route, atHome));
    expect(router.serializeUrl(result as UrlTree)).toBe('/sin-permisos');
  });
});
