
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected mockLoginAs(role: 'CUSTOMER' | 'ADMIN' | 'CASHIER'): void {
    const fakeUser: User = {
      id: 1,
      name: role === 'ADMIN' ? 'Admin de prueba' : role === 'CASHIER' ? 'Cajero de prueba' : 'Cliente de prueba',
      email: 'prueba@panya.com',
      role,
    };

    this.auth.saveSession('fake-token-de-prueba', fakeUser);

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl ?? (role === 'CUSTOMER' ? '/' : '/backoffice'));
  }
}

/*
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Auth } from '../../../../core/services/auth';
import { User } from '../../../../core/models/user.model';

@Component({
  selector: 'app-login',
  imports: [RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private auth = inject(Auth);
  private router = inject(Router);
  private route = inject(ActivatedRoute);

  protected mockLoginAs(role: 'CUSTOMER' | 'ADMIN' | 'CASHIER'): void {
    const fakeUser: User = {
      id: 1,
      name: role === 'ADMIN' ? 'Admin de prueba' : role === 'CASHIER' ? 'Cajero de prueba' : 'Cliente de prueba',
      email: 'prueba@panya.com',
      role,
    };

    this.auth.saveSession('fake-token-de-prueba', fakeUser);

    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    this.router.navigateByUrl(returnUrl ?? (role === 'CUSTOMER' ? '/' : '/backoffice'));
  }
}
*/