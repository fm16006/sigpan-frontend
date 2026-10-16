import { DOCUMENT, Injectable, inject } from '@angular/core';
import { environment } from '../../../environments/environment';

const GIS_SCRIPT = 'https://accounts.google.com/gsi/client';

export type GoogleButtonText = 'signin_with' | 'signup_with' | 'continue_with';

interface GoogleCredentialResponse {
  readonly credential: string;
}

interface GoogleAccountsId {
  initialize(config: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    ux_mode?: 'popup' | 'redirect';
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
    use_fedcm_for_button?: boolean;
  }): void;
  renderButton(
    parent: HTMLElement,
    options: {
      type: 'standard' | 'icon';
      theme?: 'outline' | 'filled_blue' | 'filled_black';
      size?: 'large' | 'medium' | 'small';
      shape?: 'rectangular' | 'pill';
      text?: GoogleButtonText;
      locale?: string;
      width?: number;
    },
  ): void;
}

type GoogleWindow = Window & { google?: { accounts?: { id?: GoogleAccountsId } } };

@Injectable({ providedIn: 'root' })
export class GoogleIdentity {
  private readonly document = inject(DOCUMENT);
  private loader: Promise<GoogleAccountsId> | null = null;
  private onCredential: ((credential: string) => void) | null = null;

  readonly enabled = environment.googleClientId.length > 0;

  async renderButton(
    host: HTMLElement,
    text: GoogleButtonText,
    onCredential: (credential: string) => void,
  ): Promise<void> {
    this.onCredential = onCredential;
    const accounts = await this.load();
    accounts.renderButton(host, {
      type: 'standard',
      theme: 'outline',
      size: 'large',
      shape: 'pill',
      text,
      locale: 'es',
      width: Math.min(Math.max(host.clientWidth, 200), 400),
    });
  }

  private load(): Promise<GoogleAccountsId> {
    this.loader ??= new Promise<GoogleAccountsId>((resolve, reject) => {
      const script = this.document.createElement('script');
      script.src = GIS_SCRIPT;
      script.async = true;
      script.defer = true;
      script.onload = () => {
        const accounts = (this.document.defaultView as GoogleWindow | null)?.google?.accounts?.id;
        if (!accounts) {
          reject(new Error('Google Identity Services no está disponible.'));
          return;
        }
        accounts.initialize({
          client_id: environment.googleClientId,
          callback: (response) => this.onCredential?.(response.credential),
          ux_mode: 'popup',
          auto_select: false,
          cancel_on_tap_outside: true,
          use_fedcm_for_button: true,
        });
        resolve(accounts);
      };
      script.onerror = () => {
        this.loader = null;
        script.remove();
        reject(new Error('No se pudo cargar Google.'));
      };
      this.document.head.appendChild(script);
    });

    return this.loader;
  }
}
