import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeStore } from './core/services/theme-store';
import { ToastHost } from './shared/ui/toast-host/toast-host';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHost],
  template: `
    <router-outlet />
    <app-toast-host />
  `,
})
export class App {
  // Aquí para que el tema también se aplique en el login y las páginas de error.
  private readonly theme = inject(ThemeStore);
}
