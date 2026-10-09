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

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        const target = safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl'));
        void this.router.navigateByUrl(target);
      },
      error: (error: AppError) => {
        this.submitting.set(false);
        applyFieldErrors(this.form, error);
        // Mensaje genérico para no revelar si el correo existe.
        this.errorMessage.set(
          error.kind === 'auth' || error.kind === 'validation'
            ? 'Correo o contraseña incorrectos.'
            : error.message,
        );
      },
    });
  }
}
