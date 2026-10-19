import { BranchOption } from '../models/branch.model';
import { resolveScope, scopeParams } from './branch-scope';

const branches: readonly BranchOption[] = [
  { id: 1, nombre: 'Principal', codigo: 'PRI', activo: true },
  { id: 2, nombre: 'Norte', codigo: 'NOR', activo: true },
  { id: 3, nombre: 'Cerrada', codigo: 'CER', activo: false },
];

describe('branch-scope', () => {
  it('por defecto muestra la sucursal del usuario', () => {
    expect(resolveScope(null, 2, branches, false)).toBe(2);
    expect(resolveScope(null, 2, branches, true)).toBe(2);
  });

  it('respeta lo elegido mientras la sucursal exista', () => {
    expect(resolveScope(1, 2, branches, false)).toBe(1);
    expect(resolveScope(99, 2, branches, false)).toBe(2);
  });

  it('«Todas» solo vale para quien puede verlas', () => {
    expect(resolveScope('todas', 2, branches, true)).toBe('todas');
    expect(resolveScope('todas', 2, branches, false)).toBe(2);
  });

  it('sin sucursal propia cae en la primera activa', () => {
    expect(resolveScope(null, null, branches, false)).toBe(1);
  });

  it('mientras no cargan las sucursales usa la del usuario y, sin ella, nada', () => {
    expect(resolveScope(null, 2, [], false)).toBe(2);
    expect(resolveScope(null, null, [], false)).toBeNull();
  });

  it('arma los parámetros que entiende el backend', () => {
    expect(scopeParams(2)).toEqual({ sucursalId: 2 });
    expect(scopeParams('todas')).toEqual({ todas: true });
    expect(scopeParams(null)).toEqual({});
  });
});
