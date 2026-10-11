import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  appName: 'SigPan',
  apiUrl: 'https://api.student-ues.me',
  requestTimeoutMs: 30_000,
};
