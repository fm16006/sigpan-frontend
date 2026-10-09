import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../config/api.config';
import { SessionStore } from '../services/session-store';
import { authInterceptor } from './auth-interceptor';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let session: SessionStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    session = TestBed.inject(SessionStore);

    session.set({
      accessToken: 'token-de-prueba',
      expiresIn: 900,
      user: { id: 1, name: 'Nilson', email: 'nilson@sigpan.test', role: 'ADMIN' },
    });
  });

  afterEach(() => httpMock.verify());

  it('agrega el token a las peticiones del backend propio', () => {
    http.get(`${CONFIG.baseUrl}/orders`).subscribe();

    const request = httpMock.expectOne(`${CONFIG.baseUrl}/orders`);
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-de-prueba');
    expect(request.request.withCredentials).toBe(true);
    request.flush({});
  });

  it('nunca envía el token a un host ajeno', () => {
    const url = 'https://evil.example/collect?r=https://api.sigpan.test';
    http.get(url).subscribe();

    const request = httpMock.expectOne(url);
    expect(request.request.headers.has('Authorization')).toBe(false);
    expect(request.request.withCredentials).toBe(false);
    request.flush({});
  });

  it('omite el token en los endpoints públicos', () => {
    http.post(`${CONFIG.baseUrl}/auth/login`, {}).subscribe();

    const request = httpMock.expectOne(`${CONFIG.baseUrl}/auth/login`);
    expect(request.request.headers.has('Authorization')).toBe(false);
    request.flush({});
  });
});
