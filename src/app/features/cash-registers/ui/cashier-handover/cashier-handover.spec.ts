import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CashShift } from '../../../../core/models/order.model';
import { CashierHandover } from './cashier-handover';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const API = 'https://api.sigpan.test/api/v1';

describe('Cambio de cajero sin cerrar el turno (HU-68)', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<CashierHandover>;

  async function render(cashiers: unknown[]): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CashierHandover);
    fixture.componentRef.setInput('shift', { id: 3, caja: 'Caja 01', usuario: 'Ana' });
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    httpMock.expectOne(`${API}/turnos/cajeros`).flush(cashiers);
    await fixture.whenStable();
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  afterEach(() => httpMock.verify());

  it('pasa el turno al cajero elegido con la nota', async () => {
    const root = await render([{ id: 9, nombre: 'Beto', rol: 'CAJERO' }]);
    const handedOver: CashShift[] = [];
    fixture.componentInstance.handedOver.subscribe((shift) => handedOver.push(shift));

    const select = root.querySelector<HTMLSelectElement>('#handover-cajero')!;
    expect(select.textContent).toContain('Beto');
    select.value = select.options[1].value;
    select.dispatchEvent(new Event('change'));
    const note = root.querySelector<HTMLTextAreaElement>('#handover-nota')!;
    note.value = ' turno de la tarde ';
    note.dispatchEvent(new Event('input'));
    root.querySelector<HTMLFormElement>('#handover-form')!.dispatchEvent(new Event('submit'));

    const request = httpMock.expectOne(`${API}/turnos/3/cambiar-cajero`);
    expect(request.request.body).toEqual({ nuevoCajeroId: 9, nota: 'turno de la tarde' });
    request.flush({ id: 3, caja: 'Caja 01', usuario: 'Beto' });
    expect(handedOver).toHaveLength(1);
    expect(handedOver[0].usuario).toBe('Beto');
  });

  it('sin cajeros disponibles lo explica y no deja enviar', async () => {
    const root = await render([]);
    expect(root.textContent).toContain('No hay otro cajero activo sin turno abierto');
    const submit = root.querySelector<HTMLButtonElement>('button[form="handover-form"]')!;
    expect(submit.disabled).toBe(true);
  });
});
