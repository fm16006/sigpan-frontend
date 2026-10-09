import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  appName: 'SigPan',
  apiUrl: 'http://localhost:8080/api/v1',
  requestTimeoutMs: 30_000,
};
