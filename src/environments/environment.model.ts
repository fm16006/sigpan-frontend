
export interface AppEnvironment {
  readonly production: boolean;
  readonly appName: string;
  /** URL base del backend, sin barra final. */
  readonly apiUrl: string;
  readonly requestTimeoutMs: number;
  /** Client ID público de Google Identity Services. Vacío desactiva el botón. */
  readonly googleClientId: string;
}
