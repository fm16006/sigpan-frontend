import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../core/config/api.config';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { ProductAdminService } from './product-admin.service';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

describe('ProductAdminService.updateChannels', () => {
  let service: ProductAdminService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    service = TestBed.inject(ProductAdminService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía un PATCH a /productos/:id/canales solo con el canal que cambia', () => {
    let recibido: CatalogProduct | undefined;

    service.updateChannels(7, { disponibleTienda: false }).subscribe((p) => (recibido = p));

    const request = httpMock.expectOne(`${CONFIG.baseUrl}/productos/7/canales`);
    expect(request.request.method).toBe('PATCH');
    expect(request.request.body).toEqual({ disponibleTienda: false });
    request.flush({ id: 7, disponiblePos: true, disponibleTienda: false });
    expect(recibido?.disponibleTienda).toBe(false);
  });

  it('puede cambiar los dos canales en una sola llamada', () => {
    service.updateChannels(7, { disponiblePos: false, disponibleTienda: true }).subscribe();

    const request = httpMock.expectOne(`${CONFIG.baseUrl}/productos/7/canales`);
    expect(request.request.body).toEqual({ disponiblePos: false, disponibleTienda: true });
    request.flush({});
  });
});
