import { Component, input } from '@angular/core';

/** Logo. En un componente porque aparece en la barra, el panel y el login. */
@Component({
  selector: 'app-brand-mark',
  template: `
    <span class="flex items-center gap-2 text-primary">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 48 48"
        fill="none"
        class="shrink-0"
        [style.width.rem]="size()"
        [style.height.rem]="size()"
        aria-hidden="true"
      >
        <path
          d="M24 8c-7 0-12 5-12 11 0 3 1.5 5.5 4 7.5-1 1.5-1.5 3-1.5 4.5 0 4.5 4 8 9.5 8s9.5-3.5 9.5-8c0-1.5-.5-3-1.5-4.5 2.5-2 4-4.5 4-7.5 0-6-5-11-12-11z"
          fill="currentColor"
          opacity="0.15"
        />
        <path
          d="M24 8c-7 0-12 5-12 11 0 3 1.5 5.5 4 7.5-1 1.5-1.5 3-1.5 4.5 0 4.5 4 8 9.5 8s9.5-3.5 9.5-8c0-1.5-.5-3-1.5-4.5 2.5-2 4-4.5 4-7.5 0-6-5-11-12-11z"
          stroke="currentColor"
          stroke-width="2"
          stroke-linejoin="round"
        />
        <path
          d="M17 20c2-1.5 4.5-2 7-2s5 .5 7 2"
          stroke="currentColor"
          stroke-width="1.5"
          stroke-linecap="round"
        />
        <circle cx="20" cy="26" r="1" fill="currentColor" />
        <circle cx="28" cy="26" r="1" fill="currentColor" />
        <circle cx="24" cy="30" r="1" fill="currentColor" />
      </svg>

      @if (label()) {
        <span class="font-serif font-semibold tracking-tight text-base-content" [class]="labelClass()">
          {{ label() }}
        </span>
      }
    </span>
  `,
})
export class BrandMark {
  /** Lado del logo en rem. */
  readonly size = input(2);
  /** Vacío para mostrar solo el símbolo. */
  readonly label = input('Panadería SigPan');
  readonly labelClass = input('text-lg');
}
