import { Component, input } from '@angular/core';
import { Breadcrumbs, Crumb } from '../breadcrumbs/breadcrumbs';

/**
 * Cabecera de las listas: migas, título, descripción y, a la derecha, las acciones
 * (la principal siempre es "Nuevo …").
 */
@Component({
  selector: 'app-page-header',
  imports: [Breadcrumbs],
  template: `
    <header class="mb-6 flex flex-col gap-3">
      @if (crumbs().length) {
        <app-breadcrumbs [items]="crumbs()" />
      }
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex min-w-0 flex-col gap-1">
          <h1 class="text-2xl font-semibold text-base-content sm:text-3xl">{{ title() }}</h1>
          @if (subtitle()) {
            <p class="max-w-3xl text-sm text-base-content/65">{{ subtitle() }}</p>
          }
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <ng-content />
        </div>
      </div>
    </header>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly crumbs = input<readonly Crumb[]>([]);
}
