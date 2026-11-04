import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { PosConsultas } from './pos-consultas';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const API = 'https://api.sigpan.test/api/v1';

describe('Consultas del mostrador · precio de un producto (HU-52)', () => {
  it('muestra la regla aplicada con su nombre legible, no «PROMOCION:1»', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PosConsultas);
    fixture.detectChanges();
    httpMock
      .expectOne((r) => r.url.startsWith(`${API}/productos/activos`))
      .flush([{ id: 4, nombre: 'Concha', disponible: 8, agotado: false }]);
    await fixture.whenStable();

    const host = fixture.nativeElement as HTMLElement;
    const input = host.querySelector<HTMLInputElement>('input[placeholder="Buscar producto"]')!;
    input.value = 'concha';
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    await fixture.whenStable();
    [...host.querySelectorAll<HTMLButtonElement>('li button')].find((b) => b.textContent?.includes('Concha'))!.click();
    fixture.detectChanges();

    httpMock.expectOne(`${API}/ventas/cotizar`).flush({
      lineas: [],
      subtotal: 0.5,
      descuento: 0.1,
      total: 0.4,
      ahorro: 0.1,
      reglaAplicada: 'PROMOCION:1',
      descartadas: [],
      sugerencias: [],
    });
    await fixture.whenStable();
    fixture.detectChanges();

    expect(host.textContent).toContain('Regla: Promoción #1');
    expect(host.textContent).not.toContain('PROMOCION:1');
  });
});
