import { Component, input } from '@angular/core';

@Component({
  selector: 'app-stat-card',
  template: `
    <div class="rounded-box border border-base-300 bg-base-100 p-5">
      <p class="text-xs font-medium uppercase tracking-wide text-base-content/50">{{ label() }}</p>
      <p class="mt-2 font-serif text-3xl font-semibold text-base-content">{{ value() }}</p>
      @if (hint()) {
        <p class="mt-1 text-xs text-base-content/50">{{ hint() }}</p>
      }
    </div>
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();
  readonly hint = input<string>();
}
