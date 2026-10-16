import { Component, computed, input } from '@angular/core';

export type CategoryKind = 'pan' | 'dulce' | 'galleta' | 'postre' | 'bebida' | 'todo';

/** Deduce qué dibujar a partir del nombre del producto o de la categoría. */
export function categoryKind(text: string): CategoryKind {
  const value = text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
  if (/bebida|cafe|jugo|refresco|licuado|horchata|\bte\b/.test(value)) {
    return 'bebida';
  }
  if (/galleta/.test(value)) {
    return 'galleta';
  }
  if (/postre|pastel|torta|flan|cheesecake|brownie|quesadilla|pie\b/.test(value)) {
    return 'postre';
  }
  if (/dulce|concha|semita|cuerno|empanada/.test(value)) {
    return 'dulce';
  }
  return 'pan';
}

/** Fondo suave por tipo de producto; usa colores del tema para verse bien en claro y oscuro. */
export const KIND_TONES: Readonly<Record<CategoryKind, string>> = {
  pan: 'bg-accent/30 text-primary',
  dulce: 'bg-warning/25 text-primary',
  galleta: 'bg-primary/15 text-primary',
  postre: 'bg-error/15 text-error',
  bebida: 'bg-secondary/20 text-secondary',
  todo: 'bg-base-200 text-base-content/70',
};

@Component({
  selector: 'app-category-icon',
  template: `
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
      class="size-full"
      aria-hidden="true"
    >
      @switch (kind()) {
        @case ('bebida') {
          <path d="M5 9h12v5a5 5 0 0 1-5 5h-2a5 5 0 0 1-5-5V9Z" />
          <path d="M17 10.5h1.5a2.5 2.5 0 0 1 0 5H17" />
          <path d="M9 3.5c-.8.8.8 1.7 0 2.5M13 3.5c-.8.8.8 1.7 0 2.5" />
          <path d="M4 21h14" />
        }
        @case ('galleta') {
          <circle cx="12" cy="12" r="8.5" />
          <circle cx="9" cy="9.5" r="1" fill="currentColor" />
          <circle cx="14.5" cy="8.5" r=".9" fill="currentColor" />
          <circle cx="15" cy="14" r="1" fill="currentColor" />
          <circle cx="9.5" cy="15" r=".9" fill="currentColor" />
          <circle cx="12" cy="12" r=".7" fill="currentColor" />
        }
        @case ('postre') {
          <path d="M4 12.5h16V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-6.5Z" />
          <path d="M4 16c1.3 1 2.7 1 4 0s2.7-1 4 0 2.7 1 4 0 2.7-1 4 0" />
          <path d="M6 12.5V10a6 2.5 0 0 1 12 0v2.5" />
          <path d="M12 7.5V4.5" />
          <path d="M12 2.5c.6.6.6 1.4 0 2-.6-.6-.6-1.4 0-2Z" fill="currentColor" />
        }
        @case ('dulce') {
          <path d="M3 15.5a9 7.5 0 0 1 18 0H3Z" />
          <path d="M3 15.5h18v1.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17v-1.5Z" />
          <path d="M12 8v7.5M7.5 10.2l2.2 5.3M16.5 10.2l-2.2 5.3M5 13l3 2.5M19 13l-3 2.5" />
        }
        @case ('todo') {
          <path d="M3.5 10h17l-1.6 9.2a1 1 0 0 1-1 .8H6.1a1 1 0 0 1-1-.8L3.5 10Z" />
          <path d="M8 10l3-6M16 10l-3-6M9 14v3M12 14v3M15 14v3" />
        }
        @default {
          <path d="M4 13.5C4 9.4 7.6 6 12 6s8 3.4 8 7.5V17a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-3.5Z" />
          <path d="M8.5 9.5 7.5 13M12.5 8.8l-1 4M16.5 9.8l-1 3.5" />
        }
      }
    </svg>
  `,
  host: { class: 'inline-block' },
})
export class CategoryIcon {
  readonly name = input('');
  readonly kindOverride = input<CategoryKind | null>(null, { alias: 'kind' });

  protected readonly kind = computed(() => this.kindOverride() ?? categoryKind(this.name()));
}
