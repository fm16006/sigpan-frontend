import { QueryParams } from '../http/api-client';
import { BranchOption } from '../models/branch.model';

/** Sucursal elegida para ver existencias: una sucursal concreta o la suma de todas. */
export type BranchScopeValue = number | 'todas';

/**
 * Alcance efectivo de una pantalla de inventario: lo elegido si todavía es válido; si no, la sucursal
 * del usuario; si no la tiene, la primera activa. «Todas» solo existe para quien puede verlas.
 */
export function resolveScope(
  selection: BranchScopeValue | null,
  ownBranchId: number | null,
  branches: readonly BranchOption[],
  canSeeAll: boolean,
): BranchScopeValue | null {
  if (selection === 'todas') {
    return canSeeAll ? 'todas' : fallbackScope(ownBranchId, branches);
  }
  if (selection !== null && branches.some((branch) => branch.id === selection)) {
    return selection;
  }
  return fallbackScope(ownBranchId, branches);
}

function fallbackScope(ownBranchId: number | null, branches: readonly BranchOption[]): BranchScopeValue | null {
  if (ownBranchId !== null && branches.some((branch) => branch.id === ownBranchId)) {
    return ownBranchId;
  }
  return ownBranchId ?? branches.find((branch) => branch.activo)?.id ?? null;
}

/** Parámetros de consulta que entiende el backend: `todas=true` o `sucursalId=N`. */
export function scopeParams(scope: BranchScopeValue | null): QueryParams {
  if (scope === 'todas') {
    return { todas: true };
  }
  return scope === null ? {} : { sucursalId: scope };
}
