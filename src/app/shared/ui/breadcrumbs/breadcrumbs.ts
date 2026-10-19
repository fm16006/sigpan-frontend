import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface Crumb {
  readonly label: string;
  /** Sin enlace, la miga es texto (el módulo o la página actual). */
  readonly link?: string;
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink],
  template: `
    <nav aria-label="Ruta" class="flex flex-wrap items-center gap-2 text-sm text-base-content/60">
      @for (crumb of items(); track $index; let last = $last) {
        @if (crumb.link) {
          <a [routerLink]="crumb.link" class="hover:text-base-content hover:underline">{{ crumb.label }}</a>
        } @else {
          <span [class.text-base-content]="last" [attr.aria-current]="last ? 'page' : null">{{ crumb.label }}</span>
        }
        @if (!last) {
          <span aria-hidden="true">›</span>
        }
      }
    </nav>
  `,
})
export class Breadcrumbs {
  readonly items = input.required<readonly Crumb[]>();
}
