import { Component, computed, input, output } from '@angular/core';
import { DatePipe } from '@angular/common';
import { CashShift, RegisterStatus } from '../../../../core/models/order.model';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { occupiedSince } from '../../register-status';

/**
 * HU-68: una caja con quién tiene el turno y desde cuándo, aunque lo haya abierto otro día. Los
 * montos solo llegan para administración; con `canManage` ofrece cambiar de cajero o cerrar.
 */
@Component({
  selector: 'app-register-card',
  imports: [DatePipe, MoneyPipe, StatusChip],
  host: { class: 'panel flex flex-col gap-3' },
  template: `
    @let item = status();
    <div class="flex items-start justify-between gap-2">
      <div>
        <h2 class="font-serif text-xl font-semibold">{{ item.caja }}</h2>
        @if (item.codigo) {
          <p class="font-mono text-xs text-base-content/60">{{ item.codigo }}</p>
        }
      </div>
      <app-status-chip [label]="item.ocupada ? 'Ocupada' : 'Libre'" [tone]="item.ocupada ? 'warn' : 'ok'" />
    </div>

    @if (item.ocupada) {
      <p class="text-sm">
        <span class="font-semibold">{{ item.usuario }}</span>
        tiene el turno #{{ item.turnoId }}
        @if (since(); as s) {
          desde <span class="font-semibold">{{ s.label }}</span>
        }
      </p>
      @if (since()?.stale) {
        <p role="alert" class="rounded-box bg-warning/15 px-3 py-2 text-sm">
          El turno viene de otro día: seguramente quedó sin cerrar.
        </p>
      }

      @if (item.turno; as shift) {
        <dl class="grid grid-cols-2 gap-x-4 gap-y-1.5 text-sm">
          <dt class="text-base-content/60">Fondo inicial</dt>
          <dd class="text-end tabular-nums">{{ shift.fondoInicial | money }}</dd>
          <dt class="text-base-content/60">Ventas</dt>
          <dd class="text-end tabular-nums">{{ shift.cantidadVentas }} · {{ shift.totalVentas | money }}</dd>
          <dt class="text-base-content/60">En efectivo</dt>
          <dd class="text-end tabular-nums">{{ shift.efectivoVentas | money }}</dd>
          <dt class="text-base-content/60">Con tarjeta</dt>
          <dd class="text-end tabular-nums">{{ shift.tarjetaVentas | money }}</dd>
          <dt class="font-semibold">Efectivo esperado</dt>
          <dd class="text-end font-semibold tabular-nums">{{ shift.efectivoEsperado | money }}</dd>
        </dl>
        @if (shift.cambios?.length) {
          <ul class="grid gap-1 border-t border-base-300 pt-2 text-xs text-base-content/70" aria-label="Cambios de cajero">
            @for (change of shift.cambios; track change.fecha) {
              <li>
                {{ change.anterior }} → <span class="font-semibold">{{ change.nuevo }}</span>
                · {{ change.fecha | date: 'd MMM, h:mm a' }}
                @if (change.realizadoPor !== change.anterior) {
                  (lo hizo {{ change.realizadoPor }})
                }
              </li>
            }
          </ul>
        }
        @if (canManage()) {
          <div class="mt-auto flex flex-wrap gap-2">
            <button type="button" class="btn btn-outline btn-sm" (click)="handover.emit(shift)">
              Cambiar cajero
            </button>
            <button type="button" class="btn btn-outline btn-sm" (click)="close.emit(shift)">
              Cerrar este turno
            </button>
          </div>
        }
      } @else {
        <p class="text-sm text-base-content/70">
          Tiene que cerrarlo o pasártelo esa persona, o la administración desde el punto de venta.
        </p>
      }
    } @else {
      <p class="text-sm text-base-content/60">Sin turno abierto.</p>
    }
  `,
})
export class RegisterCard {
  readonly status = input.required<RegisterStatus>();
  /** Administración: puede pasar el turno a otro cajero o cerrarlo. */
  readonly canManage = input(false);
  readonly handover = output<CashShift>();
  readonly close = output<CashShift>();

  protected readonly since = computed(() => {
    const apertura = this.status().apertura;
    return apertura ? occupiedSince(apertura) : null;
  });
}
