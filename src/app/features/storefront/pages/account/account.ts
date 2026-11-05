import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { ApiUser, SavedAddress } from '../../../../core/models/user.model';
import { Notifications } from '../../../../core/services/notifications';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';

interface AddressDraft {
  alias: string;
  direccion: string;
  referencia: string;
  telefono: string;
  predeterminada: boolean;
}

const EMPTY: AddressDraft = { alias: '', direccion: '', referencia: '', telefono: '', predeterminada: false };

/** HU-15: perfil y direcciones de entrega del cliente. */
@Component({
  selector: 'app-account',
  imports: [FormsModule, PageHeader],
  template: `
    <div class="container-page py-8">
      <app-page-header title="Mi cuenta" subtitle="Tus datos y direcciones de entrega" />

      <div class="grid gap-8 lg:grid-cols-2">
        <form class="grid content-start gap-3 rounded-box border border-base-300 bg-base-100 p-5" (ngSubmit)="saveProfile()">
          <h2 class="text-lg font-semibold">Datos</h2>
          <label class="grid gap-1 text-sm">
            <span>Correo</span>
            <input class="input w-full" [value]="me()?.email ?? ''" disabled />
          </label>
          <label class="grid gap-1 text-sm">
            <span>Nombre</span>
            <input class="input w-full" name="nombre" maxlength="100" required [(ngModel)]="nombre" />
          </label>
          <label class="grid gap-1 text-sm">
            <span>Teléfono</span>
            <input class="input w-full" name="telefono" type="tel" maxlength="30" [(ngModel)]="telefono" />
          </label>
          <p class="text-xs text-base-content/55">Solo pedimos lo necesario para preparar y entregar tus pedidos.</p>
          <button class="btn btn-primary justify-self-start" [disabled]="saving()">Guardar</button>
        </form>

        <section class="grid content-start gap-3 rounded-box border border-base-300 bg-base-100 p-5">
          <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">Direcciones</h2>
            @if (editing() === null) {
              <button type="button" class="btn btn-sm" (click)="newAddress()">Agregar</button>
            }
          </div>

          @if (editing() !== null) {
            <form class="grid gap-2 rounded-box bg-base-200 p-3" (ngSubmit)="saveAddress()">
              <input class="input input-sm w-full" name="alias" maxlength="40" placeholder="Casa, trabajo…" required [(ngModel)]="draft.alias" />
              <textarea class="textarea textarea-sm w-full" name="direccion" maxlength="255" rows="2" placeholder="Dirección" required [(ngModel)]="draft.direccion"></textarea>
              <input class="input input-sm w-full" name="referencia" maxlength="255" placeholder="Referencia (opcional)" [(ngModel)]="draft.referencia" />
              <input class="input input-sm w-full" name="telefono" type="tel" maxlength="30" placeholder="Teléfono (opcional)" [(ngModel)]="draft.telefono" />
              <label class="flex items-center gap-2 text-sm">
                <input type="checkbox" class="checkbox checkbox-sm" name="predeterminada" [(ngModel)]="draft.predeterminada" />
                Usar por defecto
              </label>
              <div class="flex gap-2">
                <button class="btn btn-sm btn-primary" [disabled]="saving()">Guardar</button>
                <button type="button" class="btn btn-sm btn-ghost" (click)="editing.set(null)">Cancelar</button>
              </div>
            </form>
          }

          <ul class="divide-y divide-base-300">
            @for (a of addresses(); track a.id) {
              <li class="flex items-start justify-between gap-3 py-3 text-sm">
                <span>
                  <strong>{{ a.alias }}</strong>
                  @if (a.predeterminada) { <span class="badge badge-sm ms-1">por defecto</span> }
                  <br />{{ a.direccion }}
                  @if (a.referencia) { <br /><span class="text-base-content/60">{{ a.referencia }}</span> }
                </span>
                <span class="flex gap-1">
                  <button type="button" class="btn btn-ghost btn-xs" (click)="edit(a)">Editar</button>
                  <button type="button" class="btn btn-ghost btn-xs text-error" (click)="remove(a)">Quitar</button>
                </span>
              </li>
            } @empty {
              <li class="py-3 text-sm text-base-content/60">Todavía no guardaste direcciones.</li>
            }
          </ul>
        </section>
      </div>
    </div>
  `,
})
export class Account {
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);

  private readonly profile = httpResource<ApiUser>(() => this.api.url(API_ENDPOINTS.auth.me));
  protected readonly me = computed(() => (this.profile.hasValue() ? this.profile.value() : null));
  private readonly list = httpResource<SavedAddress[]>(() => this.api.url(API_ENDPOINTS.miCuenta.direcciones), { defaultValue: [] });
  protected readonly addresses = computed(() => valueOr(this.list, []));

  protected nombre = '';
  protected telefono = '';
  protected draft: AddressDraft = { ...EMPTY };
  /** 0 = nueva; id = editando; null = cerrado. */
  protected readonly editing = signal<number | null>(null);
  protected readonly saving = signal(false);

  constructor() {
    effect(() => {
      const me = this.me();
      if (me) {
        this.nombre = me.nombre;
        this.telefono = me.telefono ?? '';
      }
    });
  }

  protected saveProfile(): void {
    if (!this.nombre.trim()) return;
    this.saving.set(true);
    this.api.put<ApiUser>(API_ENDPOINTS.miCuenta.perfil, { nombre: this.nombre.trim(), telefono: this.telefono.trim() || null }).subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success('Datos actualizados.');
      },
      error: () => this.saving.set(false),
    });
  }

  protected newAddress(): void {
    this.draft = { ...EMPTY };
    this.editing.set(0);
  }

  protected edit(a: SavedAddress): void {
    this.draft = { alias: a.alias, direccion: a.direccion, referencia: a.referencia ?? '', telefono: a.telefono ?? '', predeterminada: a.predeterminada };
    this.editing.set(a.id);
  }

  protected saveAddress(): void {
    const id = this.editing();
    if (id === null || !this.draft.alias.trim() || !this.draft.direccion.trim()) return;
    const body = { ...this.draft };
    const request = id === 0
      ? this.api.post<SavedAddress>(API_ENDPOINTS.miCuenta.direcciones, body)
      : this.api.put<SavedAddress>(API_ENDPOINTS.miCuenta.direccion(id), body);
    this.saving.set(true);
    request.subscribe({
      next: () => {
        this.saving.set(false);
        this.editing.set(null);
        this.list.reload();
      },
      error: () => this.saving.set(false),
    });
  }

  protected remove(a: SavedAddress): void {
    this.api.delete<void>(API_ENDPOINTS.miCuenta.direccion(a.id)).subscribe(() => {
      this.notifications.success(`Dirección "${a.alias}" quitada.`);
      this.list.reload();
    });
  }
}
