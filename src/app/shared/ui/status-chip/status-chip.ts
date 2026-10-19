import { Component, computed, input } from '@angular/core';

/** Un color por significado en todo el panel. */
export type ChipTone = 'ok' | 'warn' | 'bad' | 'info' | 'neutral';

// Fondo suave y punto del color del estado; el texto queda en base-content para
// mantener el contraste en los dos temas.
const TONES: Readonly<Record<ChipTone, string>> = {
  ok: 'bg-success/15 [--dot:var(--color-success)]',
  warn: 'bg-warning/25 [--dot:var(--color-warning)]',
  bad: 'bg-error/12 [--dot:var(--color-error)]',
  info: 'bg-info/15 [--dot:var(--color-info)]',
  neutral: 'bg-base-200 [--dot:var(--color-base-content)]',
};

/** Píldora de estado: Disponible, Reabastecer, Agotado, Vigente, Terminada… */
@Component({
  selector: 'app-status-chip',
  host: { class: 'inline-flex' },
  template: `
    <span
      class="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold text-base-content"
      [class]="toneClass()"
    >
      <span class="size-1.5 rounded-full bg-(--dot)" aria-hidden="true"></span>
      {{ label() }}
    </span>
  `,
})
export class StatusChip {
  readonly label = input.required<string>();
  readonly tone = input<ChipTone>('neutral');

  protected readonly toneClass = computed(() => TONES[this.tone()]);
}
