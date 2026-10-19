import { canSeePublicSite, toAuthSession } from './user.model';

describe('toAuthSession', () => {
  it('traduce la sesión del backend al modelo del frontend', () => {
    const session = toAuthSession({
      tokenAcceso: 'abc',
      tipoToken: 'Bearer',
      expiraEn: 1800,
      usuario: {
        id: 9,
        nombre: 'Ana',
        email: 'ana@sigpan.test',
        telefono: null,
        rolId: 4,
        rol: 'CAJERO',
        activo: true,
        sucursalId: 1,
        sucursal: 'Principal',
      },
    });

    expect(session).toEqual({
      accessToken: 'abc',
      expiresIn: 1800,
      user: { id: 9, name: 'Ana', email: 'ana@sigpan.test', role: 'CAJERO', sucursalId: 1, sucursal: 'Principal' },
    });
  });
});

describe('toAuthSession sin sucursal', () => {
  it('los clientes no traen sucursal', () => {
    const session = toAuthSession({
      tokenAcceso: 'abc',
      tipoToken: 'Bearer',
      expiraEn: 1800,
      usuario: { id: 2, nombre: 'Luis', email: 'luis@sigpan.test', telefono: null, rolId: 6, rol: 'CLIENTE', activo: true },
    });

    expect(session.user.sucursalId).toBeNull();
    expect(session.user.sucursal).toBeNull();
  });
});

describe('canSeePublicSite', () => {
  it('solo visitantes, clientes y administradores ven el sitio público', () => {
    expect(canSeePublicSite(null)).toBe(true);
    expect(canSeePublicSite('CLIENTE')).toBe(true);
    expect(canSeePublicSite('ADMINISTRADOR')).toBe(true);
    expect(canSeePublicSite('CAJERO')).toBe(false);
    expect(canSeePublicSite('JEFE_PRODUCCION')).toBe(false);
  });
});
