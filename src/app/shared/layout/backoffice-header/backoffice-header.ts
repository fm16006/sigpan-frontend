import { Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { ROLE_LABELS } from '../../../core/models/user.model';
import { Auth } from '../../../core/services/auth';
import { Icon } from '../../ui/icon/icon';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';
import { BackofficeSidebar } from '../backoffice-sidebar/backoffice-sidebar';

@Component({
  selector: 'app-backoffice-header',
  imports: [ThemeToggle, Icon, BackofficeSidebar],
  templateUrl: './backoffice-header.html',
  host: { '(document:keydown.escape)': 'menuOpen.set(false)' },
})
export class BackofficeHeader {
  readonly kiosk = input(false);

  protected readonly auth = inject(Auth);
  /** Panel del menú en pantallas chicas; se cierra al navegar. */
  protected readonly menuOpen = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  protected readonly roleLabel = computed(() => {
    const role = this.auth.role();
    return role ? ROLE_LABELS[role] : '';
  });
}
