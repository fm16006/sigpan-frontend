import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { Auth } from '../../../../core/services/auth';
import { AuthLayout } from '../../ui/auth-layout/auth-layout';

/** El backend debe exigir el mismo mínimo. */
const MIN_PASSWORD_LENGTH = 8;

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink, AuthLayout],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(Auth);
  private readonly router = inject(Router);

  protected readonly form = inject(FormBuilder).nonNullable.group({
    name: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(MIN_PASSWORD_LENGTH)]],
  });

  protected readonly submitting = signal(false);
  protected readonly errorMessage = signal<string | null>(null);
  protected readonly minLength = MIN_PASSWORD_LENGTH;

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
      next: () => void this.router.navigateByUrl('/storefront'),
      error: (error: AppError) => {
        this.submitting.set(false);
        applyFieldErrors(this.form, error);
        this.errorMessage.set(error.kind === 'validation' ? null : error.message);
      },
    });
  }
}
