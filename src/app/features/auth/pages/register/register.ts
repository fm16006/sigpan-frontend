import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { ROLE_HOME } from '../../../../core/models/user.model';
import { Auth } from '../../../../core/services/auth';
import { GoogleIdentity } from '../../../../core/services/google-identity';
import { AuthLayout } from '../../ui/auth-layout/auth-layout';
import { GoogleButton } from '../../ui/google-button/google-button';

/** El backend debe exigir el mismo mínimo. */
const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout, GoogleButton],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  protected readonly googleEnabled = inject(GoogleIdentity).enabled;
  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly minLength = MIN_PASSWORD_LENGTH;
  protected readonly registeredEmail = signal<string | null>(null);
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

    this.auth.register(this.form.getRawValue()).subscribe({
      next: (user) => {
        this.submitting.set(false);
        this.registeredEmail.set(user.email);
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        applyFieldErrors(this.form, error);
        this.errorMessage.set(error.kind === 'validation' ? null : error.message);
      },
    });
  }

  protected registerWithGoogle(credential: string): void {
    this.submitting.set(true);
    this.errorMessage.set(null);

    this.auth.loginWithGoogle(credential).subscribe({
      next: () => {
        const role = this.auth.role();
        void this.router.navigateByUrl(role ? ROLE_HOME[role] : '/');
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        this.errorMessage.set(
          error.kind === 'auth' ? 'No pudimos validar tu cuenta de Google.' : error.message,
        );
      },
    });
  }

  protected resend(): void {
    const email = this.registeredEmail();
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
