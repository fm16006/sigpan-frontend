import { Component, input } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Breadcrumbs, Crumb } from '../breadcrumbs/breadcrumbs';

export interface DetailTab {
  readonly label: string;
  /** Ruta relativa a la ficha ('' para la primera pestaña). */
  readonly path: string;
  readonly count?: number | null;
}

/**
 * Cabecera de toda ficha (producto, materia prima, combo, orden): migas, título,
 * código, chips (contenido `[chips]`), acciones (contenido `[actions]`) y pestañas.
 * La miniatura va en el contenido `[media]`.
 */
@Component({
  selector: 'app-detail-header',
  imports: [Breadcrumbs, RouterLink, RouterLinkActive],
  template: `
    <header class="mb-6 flex flex-col gap-4">
      <app-breadcrumbs [items]="crumbs()" />
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex min-w-0 items-center gap-4">
          <ng-content select="[media]" />
          <div class="flex min-w-0 flex-col gap-1.5">
            <h1 class="text-3xl font-semibold text-base-content">{{ title() }}</h1>
            <div class="flex flex-wrap items-center gap-2 text-sm">
              @if (code()) {
                <span class="font-mono text-xs text-base-content/60">{{ code() }}</span>
              }
              <ng-content select="[chips]" />
            </div>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2">
          <ng-content select="[actions]" />
        </div>
      </div>
      @if (tabs().length) {
        <nav class="flex gap-1 overflow-x-auto border-b border-base-300" aria-label="Secciones">
          @for (tab of tabs(); track tab.path) {
            <!-- '' en routerLink lleva a la raíz del sitio; '.' es la ficha misma. -->
            <a
              [routerLink]="tab.path || '.'"
              routerLinkActive="!border-primary !text-primary font-semibold"
              [routerLinkActiveOptions]="{ exact: true }"
              class="-mb-px inline-flex items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-4 py-3 text-sm font-medium text-base-content/65 hover:text-base-content"
            >
              {{ tab.label }}
              @if (tab.count != null) {
                <span class="rounded-full bg-base-200 px-1.5 text-[0.7rem] font-semibold text-base-content/70">{{ tab.count }}</span>
              }
            </a>
          }
        </nav>
      }
    </header>
  `,
})
export class DetailHeader {
  readonly crumbs = input.required<readonly Crumb[]>();
  readonly title = input.required<string>();
  readonly code = input<string | null>();
  readonly tabs = input<readonly DetailTab[]>([]);
}
