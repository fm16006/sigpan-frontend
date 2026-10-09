import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BrandMark } from '../../../../shared/ui/brand-mark/brand-mark';

/**
 * Marco común de login y registro: dos columnas en escritorio, una en móvil.
 * Las páginas solo proyectan sus campos.
 */
@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, BrandMark],
  template: `
    <div class="grid min-h-screen bg-base-100 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      <div class="relative flex items-center justify-center overflow-hidden px-4 py-10 sm:px-8">
        <!-- Halos decorativos para que el fondo no quede plano -->
        <div
          class="pointer-events-none absolute -left-28 -top-32 size-96 rounded-full bg-primary/5 blur-3xl"
          aria-hidden="true"
        ></div>
        <div
          class="pointer-events-none absolute -bottom-40 -right-24 size-96 rounded-full bg-accent/10 blur-3xl"
          aria-hidden="true"
        ></div>

        <div class="animate-rise relative w-full max-w-sm">
          <a routerLink="/" class="mb-8 flex justify-center lg:justify-start" aria-label="Inicio">
            <app-brand-mark [size]="2.5" />
          </a>

          <h1 class="text-2xl font-semibold text-base-content">{{ title() }}</h1>
          <p class="mt-1.5 text-sm text-base-content/60">{{ subtitle() }}</p>

          <div class="mt-7">
            <ng-content />
          </div>

          <p class="mt-7 text-center text-sm text-base-content/60 lg:text-start">
            <ng-content select="[authFooter]" />
          </p>
        </div>
      </div>

      <aside class="relative hidden overflow-hidden lg:block">
        <!-- Carga diferida: en móvil esta columna no se muestra -->
        <img
          src="images/hero-pan.jpg"
          alt="Hogazas de pan de masa madre recién salidas del horno"
          loading="lazy"
          decoding="async"
          class="animate-settle absolute inset-0 size-full object-cover"
        />
        <div
          class="absolute inset-0 bg-gradient-to-t from-neutral/90 via-neutral/45 to-neutral/5"
          aria-hidden="true"
        ></div>

        <div class="absolute inset-x-0 bottom-0 p-10 xl:p-14">
          <p class="font-serif text-2xl leading-snug text-neutral-content xl:text-3xl">
            Masa madre de 24 horas, horneada cada mañana antes de abrir.
          </p>
          <ul class="mt-6 flex flex-wrap gap-x-7 gap-y-2 text-sm text-neutral-content/75">
            <li>Retiro en sucursal</li>
            <li>Pedidos desde las 5 a. m.</li>
            <li>Trazabilidad de insumos</li>
          </ul>
        </div>
      </aside>
    </div>
  `,
})
export class AuthLayout {
  readonly title = input.required<string>();
  readonly subtitle = input('');
}
