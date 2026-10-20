import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { ReportDefinition } from '../../../../core/models/report.model';
import { RG01, RS03 } from '../../report-fixtures';
import { ReportCatalog } from './report-catalog';

const BASE = 'https://api.sigpan.test/api/v1';
const CONFIG: ApiConfig = { baseUrl: BASE, origin: 'https://api.sigpan.test', timeoutMs: 5000 };

describe('Catálogo de reportes (pantalla)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<ReportCatalog>;

  const html = () => fixture.nativeElement as HTMLElement;

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function load(catalog: ReportDefinition[]): Promise<void> {
    fixture = TestBed.createComponent(ReportCatalog);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.expectOne(`${BASE}/reportes`).flush(catalog);
    await settle();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('muestra los reportes del backend agrupados por categoría, con código, nombre y la decisión que habilita', async () => {
    await load([RS03, RG01]);

    const headings = Array.from(html().querySelectorAll('h2')).map((h) => h.textContent?.trim());
    expect(headings).toEqual(['Generales', 'Sumarizados']);

    const rows = Array.from(html().querySelectorAll('a.list-row'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('RG-01');
    expect(rows[0].textContent).toContain('Ventas globales por período');
    expect(rows[0].textContent).toContain('comparar el desempeño entre períodos');
    expect(rows[0].getAttribute('href')).toBe('/backoffice/reports/RG-01');
    expect(rows[1].textContent).toContain('RS-03');
  });

  it('no inventa reportes: solo aparece lo que devuelve el backend', async () => {
    await load([RG01]);

    const text = html().textContent ?? '';
    expect(text).toContain('RG-01');
    expect(text).not.toContain('RG-02');
    expect(text).not.toContain('Específicos');
    expect(text).not.toContain('Detallados');
  });

  it('sin reportes para el rol muestra el estado vacío', async () => {
    await load([]);

    expect(html().textContent).toContain('Sin reportes disponibles');
    expect(html().querySelectorAll('a.list-row')).toHaveLength(0);
  });

  it('si el catálogo falla ofrece reintentar', async () => {
    fixture = TestBed.createComponent(ReportCatalog);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.expectOne(`${BASE}/reportes`).flush({}, { status: 500, statusText: 'Error' });
    await settle();

    expect(html().querySelector('[role="alert"]')).not.toBeNull();
    expect(html().textContent).toContain('Reintentar');
  });
});
