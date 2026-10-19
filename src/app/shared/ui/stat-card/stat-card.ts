import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  host: { class: 'block min-w-0' },
  // Compacta en el teléfono: van de a dos por fila.
  template: `
    <div class="h-full rounded-box border border-base-300 bg-base-100 p-3.5 sm:p-5">
      <p class="text-[0.68rem] font-medium uppercase leading-tight tracking-wide text-base-content/55 sm:text-xs">
        {{ label() }}
      </p>
      <p class="mt-1.5 truncate font-serif text-2xl font-semibold text-base-content sm:mt-2 sm:text-3xl">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs leading-snug text-base-content/55">{{ hint() }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
}
