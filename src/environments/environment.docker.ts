import { AppEnvironment } from './environment.model';

// Entorno local de docker compose: el navegador llega a la API por el puerto publicado.
export const environment: AppEnvironment = {
  production: true,
  appName: 'SigPan',
  apiUrl: 'http://localhost:8080',
  requestTimeoutMs: 15_000,
  googleClientId: '285080007738-hjnldmql8b275f1mdrdu2ik0jfthu5da.apps.googleusercontent.com',
};
