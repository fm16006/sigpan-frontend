import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { Auth } from '../../../../core/services/auth';
import { AuthLayout } from '../../ui/auth-layout/auth-layout';
import { safeReturnUrl } from '../../safe-return-url';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly verified = this.route.snapshot.queryParamMap.get('verificado') === '1';
  protected readonly unconfirmedEmail = signal<string | null>(null);
  protected readonly resendStatus = signal<'idle' | 'sending' | 'sent' | 'error'>('idle');

  protected errorFor(field: string): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.submitting.set(true);
    this.errorMessage.set(null);
    this.unconfirmedEmail.set(null);
    this.resendStatus.set('idle');

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const home = this.auth.hasAnyRole(['ADMIN', 'CAJERO', 'PRODUCCION']) ? '/backoffice' : '/';
        const target = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'), home);
        void this.router.navigateByUrl(target);
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        applyFieldErrors(this.form, error);
        if (error.kind === 'forbidden') {
          this.unconfirmedEmail.set(this.form.getRawValue().email);
        }
        // Mensaje genérico para no revelar si el correo existe.
        this.errorMessage.set(
          error.kind === 'auth' || error.kind === 'validation'
            ? 'Correo o contraseña incorrectos.'
            : error.message,
        );
      },
    });
  }

  protected resend(): void {
    const email = this.unconfirmedEmail();
    if (!email || this.resendStatus() === 'sending') {
      return;
    }

    this.resendStatus.set('sending');
    this.auth.resendVerification(email).subscribe({
      next: () => this.resendStatus.set('sent'),
      error: () => this.resendStatus.set('error'),
    });
  }
}
