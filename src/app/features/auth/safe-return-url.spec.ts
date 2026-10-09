import { safeReturnUrl } from './safe-return-url';

describe('safeReturnUrl', () => {
  it('acepta rutas internas', () => {
    expect(safeReturnUrl('/backoffice/pos')).toBe('/backoffice/pos');
  });

  it('rechaza URLs absolutas a otro dominio', () => {
    expect(safeReturnUrl('https://sitio-falso.com')).toBe('/');
  });

  it('rechaza el protocolo relativo //host, que el navegador trata como externo', () => {
    expect(safeReturnUrl('//sitio-falso.com/login')).toBe('/');
  });

  it('usa el destino por defecto cuando no hay parámetro', () => {
    expect(safeReturnUrl(null, '/storefront')).toBe('/storefront');
  });
});
