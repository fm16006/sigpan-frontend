import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export const THEMES = [
  { id: 'sigpan-light', label: 'Claro' },
  { id: 'sigpan-dark', label: 'Oscuro' },
] as const;

export type ThemeName = (typeof THEMES)[number]['id'];

/** Debe coincidir con el data-theme de index.html para que no parpadee al cargar. */
const DEFAULT_THEME: ThemeName = 'sigpan-light';
const STORAGE_KEY = 'sigpan.theme';

/** Tema activo. Se aplica escribiendo data-theme en el <html>, que es lo que lee DaisyUI. */
@Injectable({ providedIn: 'root' })
export class ThemeStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly active = signal<ThemeName>(this.restore());

  readonly themes = THEMES;
  readonly theme = this.active.asReadonly();
  readonly isDark = computed(() => this.active() === 'sigpan-dark');

  constructor() {
    effect(() => {
      const theme = this.active();
      if (!this.isBrowser) return;

      document.documentElement.dataset['theme'] = theme;
      localStorage.setItem(STORAGE_KEY, theme);
    });
  }

  set(theme: ThemeName): void {
    this.active.set(theme);
  }

  toggle(): void {
    this.active.set(this.isDark() ? 'sigpan-light' : 'sigpan-dark');
  }

  // Se valida contra la lista antes de escribirlo en el DOM.
  private restore(): ThemeName {
    if (!this.isBrowser) return DEFAULT_THEME;

    const stored = localStorage.getItem(STORAGE_KEY);
    return THEMES.some((theme) => theme.id === stored) ? (stored as ThemeName) : DEFAULT_THEME;
  }
}
