
export interface AppEnvironment {
  readonly production: boolean;
  readonly appName: string;
  /** URL base del backend, sin barra final. */
  readonly apiUrl: string;
  readonly requestTimeoutMs: number;
}
