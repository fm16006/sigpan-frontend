import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { Id } from '../../../../core/models/api.model';
import { ApiUser, ROLE_LABELS, UserRole } from '../../../../core/models/user.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';

interface ApiRole {
  readonly id: Id;
  readonly nombre: UserRole;
}

@Component({
  selector: 'app-user-admin',
  imports: [PageHeader, ResourceState],
  templateUrl: './user-admin.html',
})
export class UserAdmin {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);
  private readonly auth = inject(Auth);

  protected readonly roleLabels = ROLE_LABELS;
  protected readonly filter = signal('');
  protected readonly busyId = signal<Id | null>(null);

  protected readonly users = httpResource<ApiUser[]>(() => this.api.url(API_ENDPOINTS.usuarios.root), {
    defaultValue: [],
  });
  protected readonly roles = httpResource<ApiRole[]>(() => this.api.url(API_ENDPOINTS.roles.root), {
    defaultValue: [],
  });

  protected readonly items = computed(() => {
    const term = this.filter().toLowerCase();
    return this.users
      .value()
      .filter(
        (user) =>
          !term || user.nombre.toLowerCase().includes(term) || user.email.toLowerCase().includes(term),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });

  protected isSelf(user: ApiUser): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected changeRole(user: ApiUser, rolId: string): void {
    this.save(user, { rolId: Number(rolId) }, 'Rol actualizado.');
  }

  protected toggleActive(user: ApiUser): void {
    this.save(user, { activo: !user.activo }, user.activo ? 'Usuario desactivado.' : 'Usuario activado.');
  }

  private save(user: ApiUser, changes: Partial<Pick<ApiUser, 'rolId' | 'activo'>>, message: string): void {
    this.busyId.set(user.id);
    this.api
      .put<ApiUser>(API_ENDPOINTS.usuarios.byId(user.id), {
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        rolId: changes.rolId ?? user.rolId,
        activo: changes.activo ?? user.activo,
      })
      .subscribe({
        next: () => {
          this.busyId.set(null);
          this.notifications.success(`${user.nombre}: ${message}`);
          this.users.reload();
        },
        error: () => {
          this.busyId.set(null);
          this.users.reload();
        },
      });
  }
}
