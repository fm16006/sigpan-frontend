import { Injectable, computed, inject } from '@angular/core';
import { canSeePublicSite } from '../../core/models/user.model';
import { Auth } from '../../core/services/auth';
import { BACKOFFICE_NAV } from './nav.model';

/** Menú del panel filtrado por rol. Lo usan la barra lateral y el desplegable móvil. */
@Injectable({ providedIn: 'root' })
export class BackofficeMenu {
  private readonly auth = inject(Auth);

  readonly items = computed(() =>
    BACKOFFICE_NAV.filter((item) => this.auth.hasAnyRole(item.roles)),
  );
  readonly showStore = computed(() => canSeePublicSite(this.auth.role()));
}
