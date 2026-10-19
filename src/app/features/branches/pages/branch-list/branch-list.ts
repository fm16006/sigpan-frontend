import { httpResource } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { Branch } from '../../../../core/models/branch.model';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { filterBranches } from '../../branch-utils';
import { BranchService } from '../../services/branch.service';
import { BranchFormDrawer } from '../../ui/branch-form-drawer';

/** Lista de sucursales: cada fila abre su ficha con cajas y usuarios. */
@Component({
  selector: 'app-branch-list',
  imports: [RouterLink, PageHeader, ResourceState, StatusChip, Icon, BranchFormDrawer],
  templateUrl: './branch-list.html',
})
export class BranchList {
  private readonly service = inject(BranchService);
  private readonly router = inject(Router);

  protected readonly crumbs = [{ label: 'Administración' }, { label: 'Sucursales' }];

  protected readonly branches = httpResource<Branch[]>(() => this.service.listUrl(), {
    defaultValue: [],
  });

  protected readonly query = signal('');
  protected readonly creating = signal(false);

  protected readonly all = computed(() => valueOr(this.branches, []));
  protected readonly rows = computed(() => filterBranches(this.all(), this.query()));

  protected activeRegisters(branch: Branch): number {
    return branch.cajas.filter((register) => register.activo).length;
  }

  protected onCreated(branch: Branch): void {
    this.creating.set(false);
    void this.router.navigate(['/backoffice/branches', branch.id]);
  }
}
