import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { valueOr } from '../../../../core/http/resource-value';
import { Branch } from '../../../../core/models/branch.model';
import { ApiUser } from '../../../../core/models/user.model';
import { BranchService } from '../../services/branch.service';

/**
 * Datos de la ficha de una sucursal, compartidos por el encabezado y las pestañas.
 * Se provee en el componente de la ficha; las pestañas hijas lo inyectan.
 */
@Injectable()
export class BranchDetailStore {
  private readonly service = inject(BranchService);
  private readonly route = inject(ActivatedRoute);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => Number(params.get('id')))), {
    initialValue: Number(this.route.snapshot.paramMap.get('id')),
  });

  private readonly branchResource = httpResource<Branch>(() => this.service.byIdUrl(this.id()));
  private readonly usersResource = httpResource<ApiUser[]>(() => this.service.usersUrl(this.id()), {
    defaultValue: [],
  });

  /** La sucursal, o `undefined` mientras carga o si la consulta falló. */
  readonly branch = computed(() => valueOr<Branch | undefined>(this.branchResource, undefined));
  readonly users = computed(() => valueOr(this.usersResource, []));

  readonly loading = computed(() => this.branchResource.isLoading());
  readonly failed = computed(() => !!this.branchResource.error());
  readonly usersLoading = computed(() => this.usersResource.isLoading());
  readonly usersFailed = computed(() => !!this.usersResource.error());

  reload(): void {
    this.branchResource.reload();
    this.usersResource.reload();
  }
}
