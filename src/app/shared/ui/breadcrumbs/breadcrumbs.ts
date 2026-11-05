import { Component, ElementRef, computed, inject, input, viewChildren } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { BackofficeMenu } from '../../layout/backoffice-menu';
import { NavItem } from '../../layout/nav.model';
import { Icon } from '../icon/icon';

export interface Crumb {
  readonly label: string;
  /** Sin enlace, la miga es texto (el módulo o la página actual). */
  readonly link?: string;
}

/** Miga ya resuelta: el módulo del menú se vuelve enlace o desplegable con sus secciones. */
interface ResolvedCrumb extends Crumb {
  readonly sections: readonly NavItem[];
}

@Component({
  selector: 'app-breadcrumbs',
  imports: [RouterLink, RouterLinkActive, Icon],
  template: `
    <nav aria-label="Ruta" class="flex flex-wrap items-center gap-2 text-sm text-base-content/60">
      @for (crumb of resolved(); track $index; let last = $last) {
        @if (crumb.link) {
          <a [routerLink]="crumb.link" class="hover:text-base-content hover:underline">{{ crumb.label }}</a>
        } @else if (crumb.sections.length > 0) {
          <details #menu class="dropdown">
            <summary
              class="flex cursor-pointer list-none items-center gap-1 rounded-field hover:text-base-content [&::-webkit-details-marker]:hidden"
              [attr.aria-label]="'Secciones de ' + crumb.label"
            >
              {{ crumb.label }}
              <svg class="size-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">
                <path d="M3 4.5 6 7.5 9 4.5" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </summary>
            <ul class="menu dropdown-content z-30 mt-2 w-56 rounded-box border border-base-300 bg-base-100 p-1.5 text-base-content shadow-lg">
              @for (item of crumb.sections; track item.path) {
                <li>
                  <a
                    [routerLink]="item.path"
                    routerLinkActive="bg-primary/10 font-semibold text-primary"
                    [routerLinkActiveOptions]="{ exact: item.exact ?? false }"
                    (click)="menu.open = false"
                  >
                    <app-icon [name]="item.icon" [size]="16" class="opacity-70" />
                    {{ item.label }}
                  </a>
                </li>
              }
            </ul>
          </details>
        } @else {
          <span [class.text-base-content]="last" [attr.aria-current]="last ? 'page' : null">{{ crumb.label }}</span>
        }
        @if (!last) {
          <span aria-hidden="true">›</span>
        }
      }
    </nav>
  `,
  host: {
    '(document:keydown.escape)': 'close()',
    '(document:click)': 'close($event)',
  },
})
export class Breadcrumbs {
  private readonly menu = inject(BackofficeMenu);
  private readonly menus = viewChildren<ElementRef<HTMLDetailsElement>>('menu');

  readonly items = input.required<readonly Crumb[]>();

  /**
   * Una miga sin enlace que coincide con un módulo del menú lateral se resuelve: con una
   * sola sección es un enlace directo; con varias, un desplegable para saltar a cualquier listado.
   */
  protected readonly resolved = computed<readonly ResolvedCrumb[]>(() => {
    const groups = this.menu.groups();
    const items = this.items();
    return items.map((crumb, index) => {
      const last = index === items.length - 1;
      const group = crumb.link || last ? undefined : groups.find((g) => g.label === crumb.label);
      if (!group) return { ...crumb, sections: [] };
      if (group.items.length === 1) return { ...crumb, link: group.items[0].path, sections: [] };
      return { ...crumb, sections: group.items };
    });
  });

  /** Cierra los desplegables abiertos: con Escape, o con un clic fuera de ellos. */
  protected close(event?: Event): void {
    const target = event?.target as Node | undefined;
    for (const menu of this.menus()) {
      const el = menu.nativeElement;
      if (el.open && !(target && el.contains(target))) el.open = false;
    }
  }
}
