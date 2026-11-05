import { Injectable, computed, inject } from '@angular/core';
import { canSeePublicSite } from '../../core/models/user.model';
import { Auth } from '../../core/services/auth';
import { BACKOFFICE_NAV, BACKOFFICE_NAV_GROUPS } from './nav.model';

/** Menú del panel filtrado por rol. Lo usan la barra lateral y el desplegable móvil. */
@Injectable({ providedIn: 'root' })
export class BackofficeMenu {
  private readonly auth = inject(Auth);

  readonly items = computed(() =>
    BACKOFFICE_NAV.filter((item) => this.auth.hasAnyRole(item.roles)),
  );

  /** Grupos con al menos un enlace visible para el rol. */
  readonly groups = computed(() =>
    BACKOFFICE_NAV_GROUPS.map((group) => ({
      label: group.label,
      items: group.items.filter((item) => this.auth.hasAnyRole(item.roles)),
    })).filter((group) => group.items.length > 0),
  );

  readonly showStore = computed(() => canSeePublicSite(this.auth.role()));
}
