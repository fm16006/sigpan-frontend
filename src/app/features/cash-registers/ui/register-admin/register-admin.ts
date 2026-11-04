import { Component, computed, inject, output, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { AppError } from '../../../../core/http/app-error';
import { ApiClient } from '../../../../core/http/api-client';
import { formLevelMessage } from '../../../../core/http/form-errors';
import { valueOr } from '../../../../core/http/resource-value';
import { Id } from '../../../../core/models/api.model';
import { RegisterAdmin as AdminRegister } from '../../../../core/models/branch.model';
import { Notifications } from '../../../../core/services/notifications';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';

/**
 * Administración de las cajas de la panadería: agregar, renombrar, quitar y volver a activar.
 * Quitar desactiva (las ventas y cortes de la caja se conservan). El servidor no deja quitar una
 * caja con un turno abierto ni la última activa.
 */
@Component({
  selector: 'app-register-admin',
  imports: [StatusChip],
  template: `
    <section class="panel flex flex-col gap-4" aria-labelledby="cajas-admin-titulo">
      <div class="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="cajas-admin-titulo" class="font-serif text-lg font-semibold">Administrar cajas</h2>
        <p class="text-sm text-base-content/60">
          Las cajas activas aparecen en el punto de venta para elegir dónde cobrar.
        </p>
      </div>

      @if (error(); as message) {
        <div role="alert" class="alert alert-error py-2 text-sm">
          <span>{{ message }}</span>
          <button type="button" class="btn btn-sm btn-ghost" (click)="error.set(null)">Cerrar</button>
        </div>
      }

      <form class="flex flex-wrap items-end gap-2" (submit)="$event.preventDefault(); add()">
        <label class="grid min-w-48 flex-1 gap-1 text-sm font-semibold" for="caja-nueva">
          Nueva caja
          <input
            id="caja-nueva"
            class="input w-full font-normal"
            maxlength="100"
            [placeholder]="suggestion()"
            [value]="newName()"
            (input)="newName.set($any($event.target).value)"
          />
        </label>
        <button type="submit" class="btn btn-primary" [disabled]="busy() !== null">
          @if (busy() === 'new') {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Agregar caja
        </button>
      </form>

      @if (source.isLoading() && registers().length === 0) {
        <div class="h-24 animate-pulse rounded-box bg-base-200" aria-busy="true"></div>
      } @else if (source.error()) {
        <div role="alert" class="alert alert-error text-sm">
          <span>No pudimos cargar las cajas.</span>
          <button type="button" class="btn btn-sm" (click)="source.reload()">Reintentar</button>
        </div>
      } @else {
        <ul class="divide-y divide-base-300 rounded-box border border-base-300" aria-label="Todas las cajas">
          @for (caja of registers(); track caja.id) {
            <li class="flex flex-wrap items-center gap-3 px-3 py-2.5" [class.opacity-60]="!caja.activo">
              @if (editingId() === caja.id) {
                <input
                  class="input input-sm min-w-40 flex-1"
                  maxlength="100"
                  [attr.aria-label]="'Nuevo nombre de ' + caja.nombre"
                  [value]="editName()"
                  (input)="editName.set($any($event.target).value)"
                  (keydown.enter)="rename(caja)"
                  (keydown.escape)="editingId.set(null)"
                />
                <button type="button" class="btn btn-sm btn-primary" [disabled]="busy() !== null" (click)="rename(caja)">
                  Guardar
                </button>
                <button type="button" class="btn btn-sm btn-ghost" (click)="editingId.set(null)">Cancelar</button>
              } @else {
                <span class="min-w-0 flex-1">
                  <span class="font-semibold">{{ caja.nombre }}</span>
                  <span class="ms-2 text-xs text-base-content/50">{{ caja.codigo }}</span>
                </span>
                @if (!caja.activo) {
                  <app-status-chip label="Quitada" tone="neutral" />
                } @else if (caja.ocupada) {
                  <app-status-chip [label]="'En uso · ' + caja.usuario" tone="warn" />
                } @else {
                  <app-status-chip label="Libre" tone="ok" />
                }
                <span class="flex gap-1">
                  <button type="button" class="btn btn-sm btn-ghost" [disabled]="busy() !== null" (click)="startEdit(caja)">
                    Renombrar
                  </button>
                  @if (caja.activo) {
                    <button
                      type="button"
                      class="btn btn-sm btn-ghost text-error"
                      [disabled]="busy() !== null || caja.ocupada || activeCount() <= 1"
                      [title]="caja.ocupada ? 'Cerrá el turno antes de quitarla' : activeCount() <= 1 ? 'Es la única caja activa' : ''"
                      (click)="deactivate(caja)"
                    >
                      @if (busy() === caja.id) {
                        <span class="loading loading-spinner loading-xs"></span>
                      }
                      Quitar
                    </button>
                  } @else {
                    <button type="button" class="btn btn-sm btn-ghost" [disabled]="busy() !== null" (click)="activate(caja)">
                      @if (busy() === caja.id) {
                        <span class="loading loading-spinner loading-xs"></span>
                      }
                      Activar
                    </button>
                  }
                </span>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class RegisterAdmin {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);

  /** Se agregó, quitó, activó o renombró una caja: el tablero vuelve a leer el estado. */
  readonly changed = output<void>();

  protected readonly source = httpResource<AdminRegister[]>(() => this.api.url(API_ENDPOINTS.cajas.root), {
    defaultValue: [],
  });
  protected readonly registers = computed(() => valueOr(this.source, []));
  protected readonly activeCount = computed(() => this.registers().filter((caja) => caja.activo).length);
  protected readonly suggestion = computed(
    () => `Caja ${String(this.registers().length + 1).padStart(2, '0')}`,
  );

  protected readonly newName = signal('');
  protected readonly editingId = signal<Id | null>(null);
  protected readonly editName = signal('');
  /** 'new' al agregar; el id de la caja al cambiarla. */
  protected readonly busy = signal<Id | 'new' | null>(null);
  protected readonly error = signal<string | null>(null);

  protected add(): void {
    const nombre = this.newName().trim() || this.suggestion();
    this.run('new', this.api.post<AdminRegister>(API_ENDPOINTS.cajas.root, { nombre }), (caja) => {
      this.newName.set('');
      return `Se agregó la ${caja.nombre}.`;
    });
  }

  protected startEdit(caja: AdminRegister): void {
    this.error.set(null);
    this.editName.set(caja.nombre);
    this.editingId.set(caja.id);
  }

  protected rename(caja: AdminRegister): void {
    const nombre = this.editName().trim();
    if (!nombre || nombre === caja.nombre) {
      this.editingId.set(null);
      return;
    }
    this.run(caja.id, this.api.put<AdminRegister>(API_ENDPOINTS.cajas.byId(caja.id), { nombre }), (nueva) => {
      this.editingId.set(null);
      return `${caja.nombre} ahora se llama ${nueva.nombre}.`;
    });
  }

  protected deactivate(caja: AdminRegister): void {
    this.run(caja.id, this.api.patch<AdminRegister>(API_ENDPOINTS.cajas.desactivar(caja.id), {}), () =>
      `Se quitó la ${caja.nombre}. Sus ventas y cortes se conservan.`,
    );
  }

  protected activate(caja: AdminRegister): void {
    this.run(caja.id, this.api.patch<AdminRegister>(API_ENDPOINTS.cajas.activar(caja.id), {}), () =>
      `La ${caja.nombre} vuelve a estar disponible.`,
    );
  }

  private run(key: Id | 'new', request: Observable<AdminRegister>, done: (caja: AdminRegister) => string): void {
    this.error.set(null);
    this.busy.set(key);
    request.subscribe({
      next: (caja) => {
        this.busy.set(null);
        this.notifications.success(done(caja));
        this.source.reload();
        this.changed.emit();
      },
      error: (error: AppError) => {
        this.busy.set(null);
        this.error.set(formLevelMessage(error) ?? error.message);
        this.source.reload();
      },
    });
  }
}
