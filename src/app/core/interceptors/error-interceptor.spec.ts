import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../config/api.config';
import { AppError } from '../http/app-error';
import { errorInterceptor } from './error-interceptor';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const API = CONFIG.baseUrl;

describe('errorInterceptor · 403 (DEF-20)', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  });

  afterEach(() => httpMock.verify());

  function forbidden(url: string): AppError | undefined {
    let received: AppError | undefined;
    http.post(url, {}).subscribe({ error: (error: AppError) => (received = error) });
    httpMock
      .expectOne(url)
      .flush({ mensaje: 'La autorización no es válida.' }, { status: 403, statusText: 'Forbidden' });
    return received;
  }

  it('una autorización rechazada al anular se queda en el formulario', () => {
    const error = forbidden(`${API}/ventas/31/anular`);

    expect(error?.kind).toBe('forbidden');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cualquier otro 403 sigue llevando a «sin permisos»', () => {
    forbidden(`${API}/productos`);

    expect(navigate).toHaveBeenCalledWith(['/sin-permisos']);
  });
});
