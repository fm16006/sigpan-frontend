import { Component, computed, input } from '@angular/core';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { CardPayment } from '../../models/checkout.model';

export type TerminalScreen =
  | { readonly kind: 'sin-pos'; readonly detalle?: string }
  | { readonly kind: 'conectando' | 'listo' | 'presentar' | 'leyendo' }
  | { readonly kind: 'autorizando'; readonly mensaje: string }
  | { readonly kind: 'aprobada'; readonly pago: CardPayment }
  | {
      readonly kind: 'declinada' | 'no-procesada' | 'anulada' | 'error';
      readonly mensaje: string;
    };

type LedMode = 'apagado' | 'parpadeo' | 'secuencia' | 'encendido' | 'error';

const LEDS = [0, 1, 2, 3] as const;

/** Dibujo de una terminal de pago sin contacto: luces, pantalla y ranura. */
@Component({
  selector: 'app-payment-terminal',
  imports: [MoneyPipe],
  templateUrl: './payment-terminal.html',
  styleUrl: './payment-terminal.css',
})
export class PaymentTerminal {
  readonly screen = input.required<TerminalScreen>();
  readonly amount = input.required<number>();
  readonly size = input<'sm' | 'lg'>('lg');

  protected readonly leds = LEDS;

  protected readonly online = computed(
    () => !['sin-pos', 'conectando'].includes(this.screen().kind),
  );

  protected readonly kind = computed(() => this.screen().kind);
  protected readonly payment = computed(() => {
    const screen = this.screen();
    return screen.kind === 'aprobada' ? screen.pago : null;
  });
  protected readonly message = computed(() => {
    const screen = this.screen();
    return 'mensaje' in screen ? screen.mensaje : screen.kind === 'sin-pos' ? screen.detalle : null;
  });

  protected readonly ledMode = computed<LedMode>(() => {
    switch (this.screen().kind) {
      case 'listo':
      case 'presentar':
        return 'parpadeo';
      case 'leyendo':
        return 'secuencia';
      case 'autorizando':
      case 'aprobada':
        return 'encendido';
      case 'declinada':
      case 'no-procesada':
      case 'anulada':
      case 'error':
        return 'error';
      default:
        return 'apagado';
    }
  });
}
