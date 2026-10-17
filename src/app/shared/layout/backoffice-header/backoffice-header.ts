import { Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ROLE_LABELS } from '../../../core/models/user.model';
import { Auth } from '../../../core/services/auth';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';
import { BackofficeMenu } from '../backoffice-menu';

@Component({
  selector: 'app-backoffice-header',
  imports: [RouterLink, ThemeToggle],
  templateUrl: './backoffice-header.html',
})
export class BackofficeHeader {
  readonly kiosk = input(false);

  protected readonly auth = inject(Auth);
  /** Mismo menú que la barra lateral, como desplegable en pantallas pequeñas. */
  protected readonly menu = inject(BackofficeMenu);

  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : '';
  });
}
