import { Component, computed, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Auth } from '../../../core/services/auth';
import { CartStore } from '../../../core/services/cart-store';
import { BrandMark } from '../../ui/brand-mark/brand-mark';
import { ThemeToggle } from '../../ui/theme-toggle/theme-toggle';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, RouterLinkActive, BrandMark, ThemeToggle],
  templateUrl: './navbar.html',
})
export class Navbar {
  protected readonly auth = inject(Auth);
  protected readonly cart = inject(CartStore);

  /** Solo el personal ve el acceso al panel. */
  protected readonly canEnterBackoffice = computed(() =>
    this.auth.hasAnyRole(['ADMINISTRADOR']),
  );
}
