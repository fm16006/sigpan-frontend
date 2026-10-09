import { Component, inject } from '@angular/core';
import { ThemeStore } from '../../../core/services/theme-store';

/** Alterna entre los dos temas. El icono muestra el tema al que se va a cambiar. */
@Component({
  selector: 'app-theme-toggle',
  template: `
    <button
      type="button"
      class="btn btn-ghost btn-sm btn-circle"
      [attr.aria-label]="label()"
      [title]="label()"
      (click)="theme.toggle()"
    >
      @if (theme.isDark()) {
        <!-- Pasa al tema claro -->
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="12" cy="12" r="4.2" stroke-width="1.6" />
          <path
            d="M12 3v2m0 14v2M3 12h2m14 0h2M5.6 5.6 7 7m10 10 1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4"
            stroke-width="1.6"
            stroke-linecap="round"
          />
        </svg>
      } @else {
        <!-- Pasa al tema oscuro -->
        <svg class="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
          <path
            d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5Z"
            stroke-width="1.6"
            stroke-linejoin="round"
          />
        </svg>
      }
    </button>
  `,
})
export class ThemeToggle {
  protected readonly theme = inject(ThemeStore);

  protected label(): string {
    return this.theme.isDark() ? 'Cambiar al tema claro' : 'Cambiar al tema oscuro';
  }
}
