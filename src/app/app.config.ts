import {
  ApplicationConfig,
  PLATFORM_ID,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
  provideZonelessChangeDetection,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import {
  provideRouter,
  withComponentInputBinding,
  withInMemoryScrolling,
  withViewTransitions,
} from '@angular/router';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { provideApiConfig } from './core/config/api.config';
import { authInterceptor } from './core/interceptors/auth-interceptor';
import { errorInterceptor } from './core/interceptors/error-interceptor';
import { timeoutInterceptor } from './core/interceptors/timeout-interceptor';
import { Auth } from './core/services/auth';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    provideBrowserGlobalErrorListeners(),
    provideApiConfig(),

    provideRouter(
      routes,
      // Enlaza data y parámetros de ruta a las entradas del componente.
      withComponentInputBinding(),
      withViewTransitions(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    provideClientHydration(withEventReplay()),

    provideHttpClient(
      withFetch(),
      // errorInterceptor va primero para que su reintento vuelva a pasar por authInterceptor.
      withInterceptors([errorInterceptor, authInterceptor, timeoutInterceptor]),
    ),

    // Recupera la sesión antes de que corran los guards. Solo en el navegador:
    // en SSR no hay cookie que canjear.
    provideAppInitializer(() => {
      if (!isPlatformBrowser(inject(PLATFORM_ID))) {
        return;
      }
      return inject(Auth).restoreSession();
    }),
  ],
};
