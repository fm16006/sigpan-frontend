import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { RG01, RG01_PAGE } from '../../report-fixtures';
import { ReportDetail } from './report-detail';

const BASE = 'https://api.sigpan.test/api/v1';
const CONFIG: ApiConfig = { baseUrl: BASE, origin: 'https://api.sigpan.test', timeoutMs: 5000 };

describe('Ficha de un reporte', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<ReportDetail>;

  const html = () => fixture.nativeElement as HTMLElement;
  const buttonByText = (text: string) =>
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim().includes(text));

  async function settle(): Promise<void> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    fixture.detectChanges();
  }

  async function open(codigo = 'RG-01', catalog = [RG01]): Promise<void> {
    fixture = TestBed.createComponent(ReportDetail);
    fixture.componentRef.setInput('codigo', codigo);
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve));
    httpMock.expectOne(`${BASE}/reportes`).flush(catalog);
    await settle();
  }

  const input = (id: string) => html().querySelector<HTMLInputElement | HTMLSelectElement>(`#${id}`)!;

  async function setValue(id: string, value: string): Promise<void> {
    const el = input(id);
    el.value = value;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? 'change' : 'input'));
    await settle();
  }

  async function submit(): Promise<void> {
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    await settle();
  }

  /** Genera el reporte con los valores por defecto y responde con la página de ejemplo. */
  async function generate(page = RG01_PAGE): Promise<void> {
    await submit();
    const request = httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`));
    request.flush(page);
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

  it('arma el formulario con el contrato: rango de fechas, listas con sus opciones y valores por defecto', async () => {
    await open();

    expect(html().querySelector('h1')?.textContent).toContain('RG-01 · Ventas globales por período');
    expect(html().textContent).toContain('comparar el desempeño entre períodos');
    expect(input('rp-desde').value).toBe('2026-10-01');
    expect(input('rp-hasta').value).toBe('2026-10-19');
    expect(input('rp-desde').type).toBe('date');

    const grouping = input('rp-agrupacion') as HTMLSelectElement;
    expect(Array.from(grouping.options).map((o) => o.textContent?.trim())).toEqual(['Día', 'Semana', 'Mes']);
    expect(grouping.value).toBe('DIA');

    // Una lista opcional ofrece su texto "sin filtro" y arranca ahí.
    const channel = input('rp-tipo') as HTMLSelectElement;
    expect(Array.from(channel.options).map((o) => o.textContent?.trim())).toEqual(['Todos', 'Mostrador', 'En línea']);
    expect(channel.value).toBe('');
  });

  it('migas Reportes › RG-01 y los botones de exportar bloqueados hasta generar', async () => {
    await open();

    const crumbs = html().querySelector('nav[aria-label="Ruta"]')!;
    expect(crumbs.textContent).toContain('Reportes');
    expect(crumbs.textContent).toContain('RG-01 Ventas globales por período');
    expect(buttonByText('Exportar PDF')!.disabled).toBe(true);
    expect(buttonByText('Exportar Excel')!.disabled).toBe(true);
    expect(html().textContent).toContain('Todavía no generaste el reporte');
  });

  it('los atajos llenan el rango de fechas', async () => {
    await open();

    buttonByText('Últimos 7 días')!.click();
    await settle();

    const from = input('rp-desde').value;
    const to = input('rp-hasta').value;
    expect(from <= to).toBe(true);
    const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
    expect(days).toBe(6);

    buttonByText('Este mes')!.click();
    await settle();
    expect(input('rp-desde').value.endsWith('-01')).toBe(true);
  });

  it('Generar pide el reporte con los parámetros elegidos y muestra filas con formato y la fila de totales', async () => {
    await open();
    await setValue('rp-agrupacion', 'MES');
    await setValue('rp-tipo', 'PEDIDO');

    await submit();
    const request = httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`));
    const params = new URL(request.request.urlWithParams).searchParams;
    expect(params.get('desde')).toBe('2026-10-01');
    expect(params.get('hasta')).toBe('2026-10-19');
    expect(params.get('agrupacion')).toBe('MES');
    expect(params.get('tipo')).toBe('PEDIDO');
    expect(params.get('page')).toBe('0');
    expect(params.get('size')).toBe('25');
    request.flush(RG01_PAGE);
    await settle();

    const rows = Array.from(html().querySelectorAll('tbody tr'));
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('02/10/2026');
    expect(rows[0].textContent).toContain('$72.50');
    expect(rows[1].textContent).toContain('$22.00');

    // El total viene del servidor: la pantalla no suma las filas.
    const totals = html().querySelector('tfoot tr')!;
    expect(totals.textContent).toContain('Totales');
    expect(totals.textContent).toContain('$94.50');

    expect(html().textContent).toContain('Período: 01/10/2026 al 19/10/2026');
    expect(html().textContent).toContain('por Ana María Gerente');
    expect(buttonByText('Exportar PDF')!.disabled).toBe(false);
  });

  it('la tabla va en un contenedor con scroll horizontal (teléfono)', async () => {
    await open();
    await generate();

    const region = html().querySelector('[role="region"]')!;
    expect(region.className).toContain('overflow-x-auto');
    expect(region.querySelector('table')).not.toBeNull();
  });

  it('un rango invertido se avisa en el campo sin ir al servidor', async () => {
    await open();
    await setValue('rp-desde', '2026-10-20');
    await submit();

    httpMock.expectNone((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`));
    expect(html().textContent).toContain('La fecha final no puede ser anterior a la inicial.');
  });

  it('los errores del servidor se muestran junto a cada campo', async () => {
    await open();
    await submit();
    httpMock
      .expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`))
      .flush(
        { message: 'Revisá los parámetros del reporte.', errors: { hasta: 'El rango no puede superar 366 días.' } },
        { status: 400, statusText: 'Bad Request' },
      );
    await settle();

    expect(html().textContent).toContain('El rango no puede superar 366 días.');
    expect(html().querySelectorAll('tbody tr')).toHaveLength(0);
  });

  it('sin filas muestra el estado vacío', async () => {
    await open();
    await generate({
      ...RG01_PAGE,
      filas: [],
      totales: null,
      paginacion: { pagina: 0, tamano: 25, totalFilas: 0, totalPaginas: 0 },
    });

    expect(html().textContent).toContain('Sin datos para estos parámetros');
    expect(html().querySelector('table')).toBeNull();
  });

  it('si el reporte falla por un error del servidor muestra el aviso con Reintentar', async () => {
    await open();
    await submit();
    httpMock
      .expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`))
      .flush({}, { status: 500, statusText: 'Error' });
    await settle();

    expect(html().querySelector('[role="alert"]')).not.toBeNull();

    buttonByText('Reintentar')!.click();
    await settle();
    httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`)).flush(RG01_PAGE);
    await settle();
    expect(html().querySelectorAll('tbody tr')).toHaveLength(2);
  });

  it('con varias páginas se puede navegar y los totales siguen siendo los de todo el resultado', async () => {
    await open();
    await generate({ ...RG01_PAGE, paginacion: { pagina: 0, tamano: 25, totalFilas: 40, totalPaginas: 2 } });

    expect(html().textContent).toContain('Página 1 de 2');
    buttonByText('Siguiente')!.click();
    await settle();

    const request = httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01?`));
    expect(new URL(request.request.urlWithParams).searchParams.get('page')).toBe('1');
    request.flush({ ...RG01_PAGE, paginacion: { pagina: 1, tamano: 25, totalFilas: 40, totalPaginas: 2 } });
    await settle();
    expect(html().textContent).toContain('Página 2 de 2');
    expect(buttonByText('Siguiente')!.disabled).toBe(true);
  });

  describe('exportación', () => {
    let saved: { filename: string; href: string }[];

    beforeEach(() => {
      saved = [];
      URL.createObjectURL = vi.fn(() => 'blob:reporte');
      URL.revokeObjectURL = vi.fn();
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
        saved.push({ filename: this.download, href: this.href });
      });
    });

    afterEach(() => vi.restoreAllMocks());

    it('descarga el PDF con los parámetros que están en pantalla, como blob y con el nombre del servidor', async () => {
      await open();
      await setValue('rp-agrupacion', 'SEMANA');
      await generate();

      // Cambiar el formulario sin volver a generar no altera lo que se exporta.
      await setValue('rp-agrupacion', 'MES');

      buttonByText('Exportar PDF')!.click();
      await settle();
      const request = httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01/pdf?`));
      expect(request.request.method).toBe('GET');
      expect(request.request.responseType).toBe('blob');
      expect(new URL(request.request.urlWithParams).searchParams.get('agrupacion')).toBe('SEMANA');
      expect(new URL(request.request.urlWithParams).searchParams.get('desde')).toBe('2026-10-01');
      request.flush(new Blob(['%PDF-'], { type: 'application/pdf' }), {
        headers: {
          'Content-Disposition': 'attachment; filename="RG-01_ventas-globales_2026-10-01_2026-10-19.pdf"',
        },
      });
      await settle();

      expect(saved).toEqual([
        { filename: 'RG-01_ventas-globales_2026-10-01_2026-10-19.pdf', href: 'blob:reporte' },
      ]);
    });

    it('descarga la hoja de cálculo y, si el servidor no manda nombre, usa uno de respaldo', async () => {
      await open();
      await generate();

      buttonByText('Exportar Excel')!.click();
      await settle();
      const request = httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01/xlsx?`));
      expect(request.request.responseType).toBe('blob');
      request.flush(new Blob(['x']));
      await settle();

      expect(saved).toEqual([{ filename: 'RG-01.xlsx', href: 'blob:reporte' }]);
    });

    it('mientras descarga, los botones de exportar quedan bloqueados', async () => {
      await open();
      await generate();

      buttonByText('Exportar PDF')!.click();
      await settle();
      expect(buttonByText('Exportar PDF')!.disabled).toBe(true);
      expect(buttonByText('Exportar Excel')!.disabled).toBe(true);

      httpMock.expectOne((r) => r.urlWithParams.startsWith(`${BASE}/reportes/RG-01/pdf?`)).flush(new Blob(['x']));
      await settle();
      expect(buttonByText('Exportar PDF')!.disabled).toBe(false);
    });
  });

  it('un reporte que no está en el catálogo del rol muestra que no está disponible', async () => {
    await open('RG-99', [RG01]);

    expect(html().textContent).toContain('No encontramos este reporte');
    expect(html().querySelector('form')).toBeNull();
  });
});
