import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { Company } from '../../../../core/models/company.model';
import { CompanyDrawer } from './company-drawer';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const URL = 'https://api.sigpan.test/api/v1/empresa';

const EMPRESA: Company = {
  razonSocial: 'SigPan, S.A. de C.V.',
  nombreComercial: 'Panadería SigPan',
  nit: '0614-010190-101-3',
  nrc: '123456-7',
  giro: 'Panadería',
  direccion: 'Santa Tecla',
  telefono: '2222-3333',
  correo: null,
  aplicaIva: true,
  ivaIncluido: true,
  tasaIva: 13,
  logoUrl: null,
  actualizadoEn: null,
};

describe('Datos de la empresa: confirmación al cambiar el IVA', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<CompanyDrawer>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CompanyDrawer);
    fixture.componentRef.setInput('company', EMPRESA);
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  });

  afterEach(() => httpMock.verify());

  const html = () => fixture.nativeElement as HTMLElement;
  const confirm = () => html().querySelector('[role="alertdialog"]');
  /** Botón de la ventana de confirmación (el drawer también tiene su propio «Cancelar»). */
  const button = (label: string) =>
    Array.from(confirm()!.querySelectorAll('button')).find((b) => b.textContent?.trim() === label);

  async function submit(): Promise<void> {
    html().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  function change(id: string, value: boolean | string): void {
    const input = html().querySelector<HTMLInputElement>(`#${id}, [formcontrolname="${id}"]`)!;
    if (typeof value === 'boolean') {
      input.checked = value;
      input.dispatchEvent(new Event('change'));
    } else {
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    fixture.detectChanges();
  }

  it('muestra la sección Impuestos con la configuración vigente', () => {
    expect(html().textContent).toContain('Impuestos');
    expect(html().querySelector<HTMLInputElement>('[formcontrolname="aplicaIva"]')!.checked).toBe(true);
    expect(html().querySelector<HTMLInputElement>('[formcontrolname="ivaIncluido"]')!.checked).toBe(true);
    expect(html().querySelector<HTMLInputElement>('#tasaIva')!.value).toBe('13');
  });

  it('si no cambió ningún campo del IVA se guarda sin ventana de confirmación', async () => {
    change('nombreComercial', 'Pan Nuevo');

    await submit();

    expect(confirm()).toBeNull();
    const request = httpMock.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({
      nombreComercial: 'Pan Nuevo',
      aplicaIva: true,
      ivaIncluido: true,
      tasaIva: 13,
    });
    request.flush({ ...EMPRESA, nombreComercial: 'Pan Nuevo' });
  });

  it('si cambió el IVA pide confirmación, explica el efecto y no guarda hasta aceptar', async () => {
    change('ivaIncluido', false);

    await submit();

    httpMock.expectNone(URL);
    const dialog = confirm();
    expect(dialog).not.toBeNull();
    expect(dialog!.textContent).toContain('próxima venta');
    expect(dialog!.textContent).toContain('ya registrados no cambian');
    expect(dialog!.textContent).toContain('un producto de $1.00 se cobrará $1.13');
    expect(dialog!.textContent).toContain('recalculan al cobrar');

    button('Aplicar cambio')!.click();
    fixture.detectChanges();

    const request = httpMock.expectOne(URL);
    expect(request.request.method).toBe('PUT');
    expect(request.request.body).toMatchObject({ aplicaIva: true, ivaIncluido: false, tasaIva: 13 });
    request.flush({ ...EMPRESA, ivaIncluido: false });
    fixture.detectChanges();
    expect(confirm()).toBeNull();
  });

  it('cancelar la confirmación no guarda y deja el formulario como estaba', async () => {
    change('tasaIva', '15');

    await submit();
    expect(confirm()!.textContent).toContain('de 13 % a 15 %');

    button('Cancelar')!.click();
    fixture.detectChanges();

    expect(confirm()).toBeNull();
    httpMock.expectNone(URL);
    expect(html().querySelector<HTMLInputElement>('#tasaIva')!.value).toBe('15');
  });

  it('al desactivar el IVA se deshabilitan el modo y la tasa, y la confirmación avisa que los tickets dejan de mostrarlo', async () => {
    change('aplicaIva', false);

    expect(html().querySelector<HTMLInputElement>('[formcontrolname="ivaIncluido"]')!.disabled).toBe(true);
    expect(html().querySelector<HTMLInputElement>('#tasaIva')!.disabled).toBe(true);

    await submit();

    expect(confirm()!.textContent).toContain('los tickets ya no muestran IVA');
    button('Aplicar cambio')!.click();
    const request = httpMock.expectOne(URL);
    expect(request.request.body).toMatchObject({ aplicaIva: false });
    request.flush({ ...EMPRESA, aplicaIva: false });
  });

  it('una tasa fuera de rango no se envía', async () => {
    change('tasaIva', '101');

    await submit();

    expect(confirm()).toBeNull();
    httpMock.expectNone(URL);
    expect(html().textContent).toContain('100');
  });
});
