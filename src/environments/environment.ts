import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: true,
  appName: 'SigPan',
  apiUrl: 'https://api.sigpan.example.com/api/v1',
  requestTimeoutMs: 15_000,
};
