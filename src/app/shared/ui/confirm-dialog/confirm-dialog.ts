import { Component, input, output } from '@angular/core';

/**
 * Confirmación de toda acción destructiva o irreversible (eliminar, desactivar,
 * terminar una orden). Nombra lo que se afecta y su efecto en `message`.
 */
@Component({
  selector: 'app-confirm-dialog',
  host: { '(document:keydown.escape)': 'open() && cancelled.emit()' },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 grid place-items-center p-4">
        <button
          type="button"
          class="absolute inset-0 cursor-default bg-neutral/45"
          aria-label="Cancelar"
          tabindex="-1"
          (click)="cancelled.emit()"
        ></button>
        <div
          role="alertdialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          class="relative flex w-full max-w-md flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-6 shadow-xl"
        >
          <h2 class="text-xl font-semibold">{{ title() }}</h2>
          <p class="text-sm leading-relaxed text-base-content/70">{{ message() }}</p>
          <div class="mt-2 flex justify-end gap-2">
            <button type="button" class="btn btn-ghost" (click)="cancelled.emit()">Cancelar</button>
            <button
              type="button"
              class="btn"
              [class.btn-error]="tone() === 'danger'"
              [class.btn-primary]="tone() === 'primary'"
              [disabled]="busy()"
              (click)="confirmed.emit()"
            >
              @if (busy()) {
                <span class="loading loading-spinner loading-xs"></span>
              }
              {{ confirmLabel() }}
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ConfirmDialog {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input('Eliminar');
  readonly tone = input<'danger' | 'primary'>('danger');
  readonly busy = input(false);
  readonly confirmed = output<void>();
  readonly cancelled = output<void>();
}
