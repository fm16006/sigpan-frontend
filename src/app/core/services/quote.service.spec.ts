import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../config/api.config';
import { Quote, ruleLabel } from '../models/quote.model';
import { QuoteService } from './quote.service';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

describe('QuoteService', () => {
  let service: QuoteService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    service = TestBed.inject(QuoteService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('envía la canasta por POST a /ventas/cotizar y devuelve el resultado del backend tal cual', () => {
    const respuesta: Quote = {
      lineas: [
        {
          productoId: 1,
          cantidad: 3,
          precioUnitario: 2,
          subtotal: 6,
          descuento: 0.6,
          total: 5.4,
          regla: 'PROMOCION:5',
        },
      ],
      subtotal: 6,
      descuento: 0.6,
      total: 5.4,
      aplicaIva: true,
      ivaIncluido: true,
      tasaIva: 13,
      ventasGravadas: 4.78,
      ventasExentas: 0,
      iva: 0.62,
      ahorro: 0.6,
      reglaAplicada: 'PROMOCION:5',
      descartadas: [{ regla: 'COMBO:2', total: 5.5, motivo: 'Deja un total mayor' }],
    };
    let recibida: Quote | undefined;

    service.quote({ lineas: [{ productoId: 1, cantidad: 3 }] }).subscribe((q) => (recibida = q));

    const request = httpMock.expectOne(`${CONFIG.baseUrl}/ventas/cotizar`);
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ lineas: [{ productoId: 1, cantidad: 3 }] });
    request.flush(respuesta);

    expect(recibida).toEqual(respuesta);
    expect(service.url).toBe(`${CONFIG.baseUrl}/ventas/cotizar`);
  });

  it('traduce las reglas TIPO:ID a texto legible', () => {
    expect(ruleLabel('PROMOCION:5')).toBe('Promoción #5');
    expect(ruleLabel('COMBO:2')).toBe('Combo #2');
    expect(ruleLabel('ESCALA:9')).toBe('Precio por mayoreo');
    expect(ruleLabel('LIQUIDACION:1')).toBe('Liquidación #1');
    expect(ruleLabel(null)).toBe('');
  });
});
