import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../core/config/api.config';
import { RegisterService } from './register.service';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

describe('RegisterService', () => {
  it('pide las cajas a mi-sucursal, sin parámetros de sucursal', () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), { provide: API_CONFIG, useValue: CONFIG }],
    });

    expect(TestBed.inject(RegisterService).registersUrl()).toBe(
      'https://api.sigpan.test/api/v1/sucursales/mi-sucursal',
    );
  });
});
