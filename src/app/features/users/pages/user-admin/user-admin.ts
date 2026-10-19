import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { asAppError } from '../../../../core/http/as-app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { Id } from '../../../../core/models/api.model';
import { Branch } from '../../../../core/models/branch.model';
import { ApiUser, ROLE_LABELS, USER_ROLES, UserRole } from '../../../../core/models/user.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { RoleSegment, countByRole, filterUsers } from '../../users-utils';
import { valueOr } from '../../../../core/http/resource-value';
import { BranchService } from '../../../branches/services/branch.service';

interface ApiRole {
  readonly id: Id;
  readonly nombre: UserRole;
}

type UserField = 'nombre' | 'email' | 'password' | 'telefono' | 'rolId' | 'sucursalId';

@Component({
  selector: 'app-user-admin',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, StatusChip, Icon, FormDrawer, ConfirmDialog],
  templateUrl: './user-admin.html',
})
export class UserAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);
  private readonly auth = inject(Auth);
  private readonly branchService = inject(BranchService);

  protected readonly crumbs = [{ label: 'Administración' }, { label: 'Usuarios' }];
  protected readonly roleLabels = ROLE_LABELS;

  protected readonly term = signal('');
  protected readonly roleSegment = signal<RoleSegment>('TODOS');

  protected readonly users = httpResource<ApiUser[]>(() => this.api.url(API_ENDPOINTS.usuarios.root), {
    defaultValue: [],
  });
  protected readonly roles = httpResource<ApiRole[]>(() => this.api.url(API_ENDPOINTS.roles.root), {
    defaultValue: [],
  });

  protected readonly branches = httpResource<Branch[]>(() => this.branchService.listUrl(), {
    defaultValue: [],
  });

  protected readonly userItems = computed(() => valueOr(this.users, []));
  protected readonly roleItems = computed(() => valueOr(this.roles, []));

  protected readonly items = computed(() =>
    filterUsers(this.userItems(), this.term(), this.roleSegment()),
  );
  protected readonly counts = computed(() => countByRole(this.userItems()));

  /** "Todos" y un segmento por cada rol que tiene usuarios (o que está seleccionado). */
  protected readonly segments = computed(() => {
    const counts = this.counts();
    const selected = this.roleSegment();
    const roles = USER_ROLES.filter((role) => (counts[role] ?? 0) > 0 || role === selected).map((role) => ({
      value: role as RoleSegment,
      label: ROLE_LABELS[role],
    }));
    return [{ value: 'TODOS' as RoleSegment, label: 'Todos' }, ...roles];
  });

  /** Usuario en edición; null en modo alta. */
  protected readonly editing = signal<ApiUser | null>(null);
  protected readonly drawerOpen = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly toggling = signal<ApiUser | null>(null);
  protected readonly toggleBusy = signal(false);

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
    password: ['', [Validators.minLength(8), Validators.maxLength(72)]],
    telefono: ['', [Validators.maxLength(30)]],
    rolId: [0, [Validators.required, Validators.min(1)]],
    sucursalId: [0],
  });

  private readonly selectedRoleId = toSignal(this.form.controls.rolId.valueChanges, { initialValue: 0 });

  /** El personal (todo rol menos Cliente) pertenece a una sucursal; los clientes no. */
  protected readonly needsBranch = computed(() => {
    const role = this.roleItems().find((item) => item.id === Number(this.selectedRoleId()));
    return !!role && role.nombre !== 'CLIENTE';
  });

  /** Sucursales activas; en edición se conserva la actual aunque esté inactiva. */
  protected readonly branchOptions = computed(() => {
    const current = this.editing()?.sucursalId ?? null;
    return valueOr(this.branches, []).filter((branch) => branch.activo || branch.id === current);
  });

  protected readonly toggleMessage = computed(() => {
    const user = this.toggling();
    if (!user) return '';
    return user.activo
      ? `«${user.nombre}» ya no podrá iniciar sesión hasta que lo actives de nuevo. Sus datos se conservan.`
      : `«${user.nombre}» podrá volver a iniciar sesión con su rol ${ROLE_LABELS[user.rol]}.`;
  });

  protected isSelf(user: ApiUser | null): boolean {
    return user !== null && user.id === this.auth.user()?.id;
  }

  protected fieldError(field: UserField): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected openCreate(): void {
    this.editing.set(null);
    this.formError.set(null);
    this.form.reset({ nombre: '', email: '', password: '', telefono: '', rolId: 0, sucursalId: 0 });
    this.form.controls.password.setValidators([Validators.required, Validators.minLength(8), Validators.maxLength(72)]);
    this.form.controls.password.updateValueAndValidity();
    this.form.controls.email.enable();
    this.form.controls.rolId.enable();
    this.drawerOpen.set(true);
  }

  protected openEdit(user: ApiUser): void {
    this.editing.set(user);
    this.formError.set(null);
    this.form.reset({
      nombre: user.nombre,
      email: user.email,
      password: '',
      telefono: user.telefono ?? '',
      rolId: user.rolId,
      sucursalId: user.sucursalId ?? 0,
    });
    this.form.controls.password.setValidators([]);
    this.form.controls.password.updateValueAndValidity();
    // El correo es la identidad de la cuenta: se muestra pero no se cambia desde aquí.
    this.form.controls.email.disable();
    // Nadie se quita a sí mismo el acceso de administración.
    if (this.isSelf(user)) this.form.controls.rolId.disable();
    else this.form.controls.rolId.enable();
    this.drawerOpen.set(true);
  }

  protected closeDrawer(): void {
    this.drawerOpen.set(false);
    this.editing.set(null);
    this.formError.set(null);
  }

  protected save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const current = this.editing();
    const telefono = raw.telefono.trim() || null;

    if (this.needsBranch() && Number(raw.sucursalId) < 1) {
      this.form.controls.sucursalId.setErrors({ server: 'Elegí la sucursal del usuario.' });
      this.form.controls.sucursalId.markAsTouched();
      return;
    }
    const sucursalId = this.needsBranch() ? Number(raw.sucursalId) : null;

    this.saving.set(true);
    const request = current
      ? this.api.put<ApiUser>(API_ENDPOINTS.usuarios.byId(current.id), {
          nombre: raw.nombre.trim(),
          email: current.email,
          telefono,
          rolId: Number(raw.rolId),
          sucursalId,
          activo: current.activo,
        })
      : this.api.post<ApiUser>(API_ENDPOINTS.usuarios.root, {
          nombre: raw.nombre.trim(),
          email: raw.email.trim(),
          password: raw.password,
          telefono,
          rolId: Number(raw.rolId),
          sucursalId,
        });

    request.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.notifications.success(current ? `${saved.nombre}: datos actualizados.` : `Usuario ${saved.nombre} creado.`);
        this.closeDrawer();
        this.users.reload();
      },
      error: (error: unknown) => {
        this.saving.set(false);
        const appError = asAppError(error);
        applyFieldErrors(this.form, appError);
        this.formError.set(formLevelMessage(appError));
      },
    });
  }

  protected askToggle(user: ApiUser): void {
    this.toggling.set(user);
  }

  protected cancelToggle(): void {
    if (!this.toggleBusy()) this.toggling.set(null);
  }

  protected confirmToggle(): void {
    const user = this.toggling();
    if (!user) return;

    this.toggleBusy.set(true);
    this.api
      .put<ApiUser>(API_ENDPOINTS.usuarios.byId(user.id), {
        nombre: user.nombre,
        email: user.email,
        telefono: user.telefono,
        rolId: user.rolId,
        sucursalId: user.sucursalId ?? null,
        activo: !user.activo,
      })
      .subscribe({
        next: () => {
          this.toggleBusy.set(false);
          this.toggling.set(null);
          this.notifications.success(`${user.nombre}: ${user.activo ? 'usuario desactivado.' : 'usuario activado.'}`);
          this.closeDrawer();
          this.users.reload();
        },
        error: (error: unknown) => {
          this.toggleBusy.set(false);
          this.toggling.set(null);
          // Los errores de validación no los avisa el interceptor.
          const appError = asAppError(error);
          if (appError.kind === 'validation') this.notifications.error(appError.message);
        },
      });
  }
}
