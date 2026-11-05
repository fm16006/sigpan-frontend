import { Component, input, output } from '@angular/core';
import { Icon } from '../icon/icon';

/**
 * Panel lateral para crear y editar. Es el único patrón de formulario del panel:
 * la lista o la ficha siguen visibles detrás.
 *
 * Contenido: el cuerpo del formulario sin selector, y los botones en `[footer]`
 * (Cancelar a la izquierda de Guardar). Escape y el fondo cierran.
 */
@Component({
  selector: 'app-form-drawer',
  imports: [Icon],
  host: { '(document:keydown.escape)': 'open() && closed.emit()' },
  template: `
    @if (open()) {
      <div class="fixed inset-0 z-50 flex justify-end">
        <button
          type="button"
          class="absolute inset-0 cursor-default bg-neutral/45"
          aria-label="Cerrar sin guardar"
          tabindex="-1"
          (click)="closed.emit()"
        ></button>
        <aside
          role="dialog"
          aria-modal="true"
          [attr.aria-label]="title()"
          class="relative flex h-full w-full max-w-lg flex-col border-s border-base-300 bg-base-100 shadow-xl"
        >
          <div class="flex items-start justify-between gap-3 border-b border-base-300 px-6 py-5">
            <div class="flex flex-col gap-0.5">
              <h2 class="text-2xl font-semibold">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="text-sm text-base-content/60">{{ subtitle() }}</p>
              }
            </div>
            <button type="button" class="btn btn-ghost btn-sm btn-square" aria-label="Cerrar sin guardar" (click)="closed.emit()">
              <app-icon name="close" />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto px-6 py-5">
            <ng-content />
          </div>
          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-base-300 px-6 py-4">
            <ng-content select="[footer]" />
          </div>
        </aside>
      </div>
    }
  `,
})
export class FormDrawer {
  readonly open = input(false);
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly closed = output<void>();
}
