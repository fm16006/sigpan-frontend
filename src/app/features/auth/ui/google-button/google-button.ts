import { Component, ElementRef, afterNextRender, inject, input, output, signal, viewChild } from '@angular/core';
import { GoogleButtonText, GoogleIdentity } from '../../../../core/services/google-identity';

@Component({
  selector: 'app-google-button',
  template: `
    <div #host class="flex min-h-10 w-full justify-center"></div>
    @if (failed()) {
      <p role="alert" class="mt-1 text-center text-xs text-error">
        No se pudo cargar el inicio de sesión con Google.
      </p>
    }
  `,
})
export class GoogleButton {
  private readonly google = inject(GoogleIdentity);
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  readonly text = input<GoogleButtonText>('continue_with');
  readonly credential = output<string>();

  protected readonly failed = signal(false);

  constructor() {
    afterNextRender(() => {
      this.google
        .renderButton(this.host().nativeElement, this.text(), (value) => this.credential.emit(value))
        .catch(() => this.failed.set(true));
    });
  }
}
