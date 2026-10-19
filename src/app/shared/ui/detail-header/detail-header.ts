import { Component, ElementRef, afterNextRender, input, signal, viewChild } from '@angular/core';
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
  host: { '(window:resize)': 'updateOverflow()' },
  imports: [Breadcrumbs, RouterLink, RouterLinkActive],
  template: `
    <header class="mb-4 flex flex-col gap-3 sm:mb-6 sm:gap-4">
      <app-breadcrumbs [items]="crumbs()" />
      <div class="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        <!-- Teléfono: miniatura y título en una fila, y debajo código y chips a lo ancho. -->
        <div
          class="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-2 max-sm:w-full sm:flex sm:gap-4"
        >
          <div
            class="shrink-0 empty:hidden max-sm:[&_[media]]:size-12 max-sm:[&_[media]]:rounded-xl max-sm:[&_[media]>*]:size-12 max-sm:[&_[media]>*]:rounded-xl max-sm:[&_[media]>*]:text-xl"
          >
            <ng-content select="[media]" />
          </div>
          <div class="max-sm:contents sm:flex sm:min-w-0 sm:flex-col sm:gap-1.5">
            <h1 class="min-w-0 text-xl font-semibold text-base-content max-sm:leading-tight sm:text-3xl">{{ title() }}</h1>
            <div class="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm max-sm:col-span-2">
              @if (code()) {
                <span class="font-mono text-xs text-base-content/60">{{ code() }}</span>
              }
              <ng-content select="[chips]" />
            </div>
          </div>
        </div>
        <!-- Teléfono: acciones en una fila compacta; la principal a la derecha y el menú al final. -->
        <div
          class="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:justify-end max-sm:[&_.btn]:btn-sm"
        >
          <ng-content select="[actions]" />
        </div>
      </div>
      @if (tabs().length) {
        <div class="relative">
          <nav
            #tabsNav
            class="flex gap-1 overflow-x-auto border-b border-base-300 max-sm:snap-x max-sm:snap-proximity max-sm:scroll-px-10 max-sm:[scrollbar-width:none] max-sm:[&::-webkit-scrollbar]:hidden"
            aria-label="Secciones"
            (scroll)="updateOverflow()"
          >
            @for (tab of tabs(); track tab.path) {
              <!-- '' en routerLink lleva a la raíz del sitio; '.' es la ficha misma. -->
              <a
                [routerLink]="tab.path || '.'"
                routerLinkActive="!border-primary !text-primary font-semibold"
                ariaCurrentWhenActive="page"
                #tabLink
                (isActiveChange)="$event && reveal(tabLink)"
                [routerLinkActiveOptions]="{ exact: true }"
                class="-mb-px inline-flex shrink-0 snap-start items-center gap-1.5 whitespace-nowrap border-b-2 border-transparent px-3 py-3 text-sm font-medium text-base-content/65 hover:text-base-content sm:px-4"
              >
                {{ tab.label }}
                @if (tab.count != null) {
                  <span class="rounded-full bg-base-200 px-1.5 text-[0.7rem] font-semibold text-base-content/70">{{ tab.count }}</span>
                }
              </a>
            }
          </nav>
          <!-- Degradado que avisa, solo en teléfono, que hay más pestañas a la derecha. -->
          @if (moreRight()) {
            <span
              aria-hidden="true"
              class="pointer-events-none absolute inset-y-0 right-0 w-10 bg-linear-to-l from-base-200 to-transparent sm:hidden"
            ></span>
          }
        </div>
      }
    </header>
  `,
})
export class DetailHeader {
  readonly crumbs = input.required<readonly Crumb[]>();
  readonly title = input.required<string>();
  readonly code = input<string | null>();
  readonly tabs = input<readonly DetailTab[]>([]);

  private readonly nav = viewChild<ElementRef<HTMLElement>>('tabsNav');

  /** Hay pestañas fuera de vista a la derecha (solo importa en teléfono). */
  protected readonly moreRight = signal(false);

  constructor() {
    afterNextRender(() => this.updateOverflow());
  }

  protected updateOverflow(): void {
    const el = this.nav()?.nativeElement;
    this.moreRight.set(!!el && el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }

  /** Deja a la vista la pestaña activa, sin mover la página en vertical. */
  protected reveal(tab: HTMLElement): void {
    const run = () => {
      tab.scrollIntoView?.({ inline: 'nearest', block: 'nearest' });
      this.updateOverflow();
    };
    // Las fuentes web cambian el ancho de las pestañas: se espera a que carguen para medir bien.
    setTimeout(run);
    document.fonts?.ready.then(run);
  }
}
