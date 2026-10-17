import { Component, input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  template: `
    <div
      class="flex flex-col items-center justify-center gap-2 rounded-box border border-dashed border-base-300 px-6 py-14 text-center"
    >
      <p class="font-medium text-base-content">{{ title() }}</p>
      @if (description()) {
        <p class="max-w-sm text-sm text-base-content/60">{{ description() }}</p>
      }
      <div class="mt-2">
        <ng-content />
      </div>
    </div>
  `,
})
export class EmptyState {
  readonly title = input.required<string>();
  readonly description = input<string>();
}
