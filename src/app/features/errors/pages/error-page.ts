import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

/** Sirve el 403 y el 404. Los textos llegan como data de la ruta. */
@Component({
  selector: 'app-error-page',
  imports: [RouterLink],
  template: `
    <main class="grid min-h-screen place-items-center bg-base-200 px-4">
      <div class="max-w-md text-center">
        <p class="font-serif text-6xl font-semibold text-primary">{{ code() }}</p>
        <h1 class="mt-4 text-2xl font-semibold">{{ heading() }}</h1>
        <p class="mt-2 text-base-content/65">{{ message() }}</p>
        <a routerLink="/" class="btn btn-primary mt-7">Volver al inicio</a>
      </div>
    </main>
  `,
})
export class ErrorPage {
  readonly code = input('404');
  readonly heading = input('Página no encontrada');
  readonly message = input('El enlace que seguiste no existe o fue movido.');
}
