import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../config/api.config';
import { BUSINESS_INFO } from '../config/business.config';
import { Company, toBusinessInfo } from '../models/company.model';
import { CompanyStore } from './company-store';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

const EMPRESA: Company = {
  razonSocial: 'Panificadora Nueva, S.A. de C.V.',
  nombreComercial: 'Pan Nuevo',
  nit: '0614-010190-101-3',
  nrc: '123456-7',
  giro: 'Panadería',
  direccion: 'Santa Tecla',
  telefono: '2222-3333',
  correo: 'hola@pannuevo.sv',
  logoUrl: 'https://blob/empresa/logo.png',
  actualizadoEn: '2026-10-19T10:00:00',
};

describe('toBusinessInfo', () => {
  it('sin datos del API devuelve los de respaldo', () => {
    expect(toBusinessInfo(null)).toBe(BUSINESS_INFO);
  });

  it('con datos del API usa los de la empresa y conserva el horario', () => {
    const info = toBusinessInfo(EMPRESA);
    expect(info.nombreComercial).toBe('Pan Nuevo');
    expect(info.nit).toBe('0614-010190-101-3');
    expect(info.correo).toBe('hola@pannuevo.sv');
    expect(info.horario).toBe(BUSINESS_INFO.horario);
  });
});

describe('CompanyStore', () => {
  let store: CompanyStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    store = TestBed.inject(CompanyStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('mientras carga muestra los datos de respaldo y luego los reales', () => {
    expect(store.info()).toBe(BUSINESS_INFO);

    store.load();
    expect(store.status()).toBe('loading');
    expect(store.info()).toBe(BUSINESS_INFO);

    httpMock.expectOne('https://api.sigpan.test/api/v1/empresa').flush(EMPRESA);

    expect(store.status()).toBe('loaded');
    expect(store.info().nombreComercial).toBe('Pan Nuevo');
  });

  it('si el API falla se queda con los datos de respaldo y permite reintentar', () => {
    store.load();
    httpMock
      .expectOne('https://api.sigpan.test/api/v1/empresa')
      .flush({ message: 'caído' }, { status: 500, statusText: 'Server Error' });

    expect(store.status()).toBe('failed');
    expect(store.info()).toBe(BUSINESS_INFO);

    store.load();
    httpMock.expectOne('https://api.sigpan.test/api/v1/empresa').flush(EMPRESA);
    expect(store.status()).toBe('loaded');
  });

  it('no vuelve a pedir los datos si ya cargaron', () => {
    store.load();
    httpMock.expectOne('https://api.sigpan.test/api/v1/empresa').flush(EMPRESA);

    store.load();
    httpMock.expectNone('https://api.sigpan.test/api/v1/empresa');
  });

  it('al guardar actualiza el cache que ven el ticket y el pie', () => {
    store
      .update({
        razonSocial: EMPRESA.razonSocial,
        nombreComercial: 'Pan Nuevo',
        nit: EMPRESA.nit,
        nrc: EMPRESA.nrc,
        giro: EMPRESA.giro,
        direccion: EMPRESA.direccion,
        telefono: EMPRESA.telefono,
        correo: null,
      })
      .subscribe();

    const req = httpMock.expectOne('https://api.sigpan.test/api/v1/empresa');
    expect(req.request.method).toBe('PUT');
    req.flush({ ...EMPRESA, correo: null });

    expect(store.info().nombreComercial).toBe('Pan Nuevo');
    expect(store.company()?.correo).toBeNull();
  });
});
