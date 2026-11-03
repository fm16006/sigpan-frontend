import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { DeliveryMode } from '../../../../core/models/order.model';
import { ApiUser } from '../../../../core/models/user.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { OrderService } from '../../../storefront/services/order.service';
import { PosLine } from '../../models/checkout.model';

/** Encargo que la caja registra a nombre de un cliente: se paga al retirar, no en este momento. */
@Component({
  selector: 'app-pos-encargo',
  imports: [FormsModule, MoneyPipe],
  host: { '(document:keydown.escape)': 'cancelled.emit()' },
  template: `
    <div class="fixed inset-0 z-50 grid place-items-center overflow-y-auto p-4">
      <button
        type="button"
        class="absolute inset-0 cursor-default bg-neutral/45"
        aria-label="Cancelar"
        tabindex="-1"
        (click)="cancelled.emit()"
      ></button>
      <form
        role="dialog"
        aria-modal="true"
        aria-label="Registrar encargo"
        class="relative grid w-full max-w-md gap-3 rounded-box border border-base-300 bg-base-100 p-6"
        (submit)="$event.preventDefault(); submit()"
      >
        <h2 class="text-xl font-semibold">Registrar encargo</h2>
        <p class="text-sm text-base-content/70">
          {{ lines().length }} línea(s) · {{ total() | money }}. El cliente paga al retirar.
        </p>

        <label class="form-control">
          <span class="label-text mb-1">Correo del cliente</span>
          <span class="flex gap-2">
            <input
              class="input input-bordered min-w-0 flex-1"
              type="email"
              name="correo"
              autocomplete="off"
              [ngModel]="email()"
              (ngModelChange)="email.set($event); client.set(null)"
            />
            <button
              type="button"
              class="btn btn-outline"
              [disabled]="!email().trim() || searching()"
              (click)="search()"
            >
              Buscar
            </button>
          </span>
        </label>
        @if (client(); as found) {
          <p class="text-sm text-success">{{ found.nombre }}</p>
        }

        <label class="form-control">
          <span class="label-text mb-1">Modalidad</span>
          <select class="select select-bordered w-full" name="modalidad" [(ngModel)]="mode">
            <option value="RETIRO">Retiro en tienda</option>
            <option value="ENTREGA">Entrega a domicilio</option>
          </select>
        </label>
        <label class="form-control">
          <span class="label-text mb-1">Fecha y hora</span>
          <input
            class="input input-bordered w-full"
            type="datetime-local"
            name="fecha"
            [ngModel]="date()"
            (ngModelChange)="date.set($event)"
          />
        </label>
        @if (mode === 'ENTREGA') {
          <label class="form-control">
            <span class="label-text mb-1">Dirección de entrega</span>
            <input
              class="input input-bordered w-full"
              name="direccion"
              maxlength="255"
              [ngModel]="address()"
              (ngModelChange)="address.set($event)"
            />
          </label>
        }
        <label class="form-control">
          <span class="label-text mb-1">Teléfono de contacto</span>
          <input class="input input-bordered w-full" type="tel" name="telefono" [(ngModel)]="phone" />
        </label>

        @if (error(); as message) {
          <p class="text-sm text-error" role="alert">{{ message }}</p>
        }
        <div class="mt-2 flex justify-end gap-2">
          <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
          <button type="submit" class="btn btn-primary" [disabled]="!ready() || saving()">
            @if (saving()) {
              <span class="loading loading-spinner loading-xs"></span>
            }
            Registrar
          </button>
        </div>
      </form>
    </div>
  `,
})
export class PosEncargo {
  private readonly orders = inject(OrderService);
  private readonly notifications = inject(Notifications);
  private readonly destroyRef = inject(DestroyRef);

  readonly lines = input.required<readonly PosLine[]>();
  readonly total = input.required<number>();
  readonly cancelled = output<void>();
  readonly staleTotal = output<void>();
  readonly completed = output<void>();

  protected readonly email = signal('');
  protected readonly client = signal<ApiUser | null>(null);
  protected readonly date = signal('');
  protected readonly address = signal('');
  protected readonly searching = signal(false);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected mode: DeliveryMode = 'RETIRO';
  protected phone = '';

  protected readonly ready = computed(() => !!this.client() && !!this.date());

  protected search(): void {
    this.searching.set(true);
    this.error.set(null);
    this.orders
      .findClient(this.email().trim())
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (client) => {
          this.client.set(client);
          this.phone ||= client.telefono ?? '';
          this.searching.set(false);
        },
        error: (error: AppError) => {
          this.error.set(error.message);
          this.searching.set(false);
        },
      });
  }

  protected submit(): void {
    const client = this.client();
    if (!client || !this.date()) {
      return;
    }
    if (this.mode === 'ENTREGA' && !this.address().trim()) {
      this.error.set('Indicá la dirección de entrega.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.orders
      .counterEncargo(client.id, {
        lineas: this.lines().map((line) => ({ productoId: line.product.id, cantidad: line.quantity })),
        totalEsperado: this.total(),
        modalidad: this.mode,
        fechaProgramada: this.date(),
        ...(this.mode === 'ENTREGA' ? { direccionEntrega: this.address().trim() } : {}),
        ...(this.phone.trim() ? { telefonoContacto: this.phone.trim() } : {}),
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (sale) => {
          this.notifications.success(`Encargo #${sale.id} registrado para ${client.nombre}.`);
          this.completed.emit();
        },
        error: (error: AppError) => {
          if (error.code === 'TOTAL_CAMBIO') {
            this.staleTotal.emit();
          }
          this.error.set(error.message);
          this.saving.set(false);
        },
      });
  }
}
