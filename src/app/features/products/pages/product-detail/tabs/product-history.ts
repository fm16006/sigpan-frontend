import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Auth } from '../../../../../core/services/auth';

/** Historial del producto. Pendiente: el backend no filtra la bitácora por entidad. */
@Component({
  selector: 'app-product-history',
  imports: [RouterLink],
  template: `
    <section class="panel max-w-3xl" aria-labelledby="h-hist">
      <div class="flex flex-col gap-0.5">
        <h2 id="h-hist" class="font-serif text-lg font-semibold">Cambios en este producto</h2>
        <span class="text-xs text-base-content/60">Quién cambió qué y cuándo, tomado de la bitácora.</span>
      </div>
      <!-- Pendiente backend: permitir filtrar la bitácora por producto -->
      <p class="rounded-lg border border-dashed border-base-300 px-3.5 py-3 text-sm leading-relaxed text-base-content/70">
        Próximamente: los cambios de este producto. Mientras tanto, los cambios se encuentran en la
        bitácora general.
      </p>
      <div class="flex flex-wrap items-center justify-between gap-3 text-sm text-base-content/60">
        <span>Los registros de la bitácora no se pueden editar ni borrar.</span>
        @if (isAdmin) {
          <a routerLink="/backoffice/audit" class="font-semibold text-primary hover:underline">
            Abrir la bitácora completa →
          </a>
        }
      </div>
    </section>
  `,
})
export class ProductHistory {
  /** La bitácora es solo de administración. */
  protected readonly isAdmin = inject(Auth).hasAnyRole(['ADMINISTRADOR']);
}
