import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiClient } from '../http/api-client';
import { valueOr } from '../http/resource-value';
import { BranchOption } from '../models/branch.model';
import { UserRole } from '../models/user.model';
import { BranchScopeValue, resolveScope, scopeParams } from '../utils/branch-scope';
import { SessionStore } from './session-store';

/** Quienes leen existencias por sucursal (los mismos roles que las rutas de inventario). */
const INVENTORY_ROLES: readonly UserRole[] = ['ADMINISTRADOR', 'JEFE_PRODUCCION', 'BODEGUERO'];

/**
 * Sucursal cuyas existencias se están viendo en Materia prima, Productos, Movimientos y el Panel.
 * Por defecto la del usuario; administración puede elegir «Todas» para ver la suma. La elección se
 * comparte entre pantallas, así que al pasar de una a otra no hay que volver a elegirla.
 */
@Injectable({ providedIn: 'root' })
export class BranchScope {
  private readonly api = inject(ApiClient);
  private readonly session = inject(SessionStore);

  private readonly branchesRes = httpResource<BranchOption[]>(
    () =>
      this.session.isAuthenticated() && this.session.hasAnyRole(INVENTORY_ROLES)
        ? this.api.url(API_ENDPOINTS.inventarios.sucursales)
        : undefined,
    { defaultValue: [] },
  );

  private readonly selection = signal<BranchScopeValue | null>(null);

  /** Todas las sucursales, por nombre. */
  readonly branches = computed(() =>
    [...valueOr(this.branchesRes, [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
  );
  /** Las que se pueden elegir para operar. */
  readonly activeBranches = computed(() => this.branches().filter((branch) => branch.activo));
  readonly loading = computed(() => this.branchesRes.isLoading());
  readonly failed = computed(() => !!this.branchesRes.error());

  /** Solo administración ve la suma de todas las sucursales. */
  readonly canSeeAll = computed(() => this.session.role() === 'ADMINISTRADOR');
  readonly ownBranchId = computed(() => this.session.user()?.sucursalId ?? null);

  /** Lo que se está viendo: una sucursal, «todas», o null mientras se cargan las sucursales. */
  readonly scope = computed(() =>
    resolveScope(this.selection(), this.ownBranchId(), this.branches(), this.canSeeAll()),
  );
  readonly isAll = computed(() => this.scope() === 'todas');
  /** Id de la sucursal vista; null con «Todas» o sin sucursal. */
  readonly branchId = computed(() => {
    const scope = this.scope();
    return typeof scope === 'number' ? scope : null;
  });
  readonly label = computed(() => {
    const scope = this.scope();
    if (scope === 'todas') return 'Todas las sucursales';
    return this.branches().find((branch) => branch.id === scope)?.nombre ?? '';
  });
  /** Se puede escribir (ajustes, compras) solo cuando hay una sucursal concreta. */
  readonly canWrite = computed(() => this.branchId() !== null);
  /** Parámetros de consulta (`sucursalId` o `todas`) para los endpoints de existencias y kárdex. */
  readonly params = computed(() => scopeParams(this.scope()));

  select(value: BranchScopeValue): void {
    this.selection.set(value);
  }

  nameOf(id: number | null | undefined): string {
    return this.branches().find((branch) => branch.id === id)?.nombre ?? '';
  }
}
