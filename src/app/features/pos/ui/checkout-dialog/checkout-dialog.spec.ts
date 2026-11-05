import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Sale } from '../../../../core/models/order.model';
import { Quote } from '../../../../core/models/quote.model';
import { errorInterceptor } from '../../../../core/interceptors/error-interceptor';
import { CompanyStore } from '../../../../core/services/company-store';
import { saleToReceipt } from '../../pos-pedidos-logic';
import { formatReceipt, RECEIPT_WIDTH } from '../../receipt/receipt-format';
import { PosLine } from '../../models/checkout.model';
import { CardTerminal } from '../../services/card-terminal';
import { TicketPrinter } from '../../services/ticket-printer';
import { CheckoutDialog } from './checkout-dialog';
import { of } from 'rxjs';
import { vi } from 'vitest';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const SALE_URL = 'https://api.sigpan.test/api/v1/ventas/mostrador';

const PAN = { id: 1, nombre: 'Pan dulce', precio: 1.13, exentoIva: false } as CatalogProduct;
const LINES: PosLine[] = [{ product: PAN, quantity: 2 }];

/** 2 × $1.13 con IVA NO incluido: el cliente paga $2.26 + $0.29 = $2.55. */
const QUOTE_SUMADO: Quote = {
  lineas: [
    { productoId: 1, cantidad: 2, precioUnitario: 1.13, subtotal: 2.26, descuento: 0, total: 2.26, regla: null },
  ],
  subtotal: 2.26,
  descuento: 0,
  total: 2.55,
  aplicaIva: true,
  ivaIncluido: false,
  tasaIva: 13,
  ventasGravadas: 2.26,
  ventasExentas: 0,
  iva: 0.29,
  ahorro: 0,
  reglaAplicada: null,
  descartadas: [],
};

const SALE: Sale = {
  id: 501,
  usuarioId: 8,
  usuario: 'Ana',
  caja: 'Caja 01',
  tipo: 'MOSTRADOR',
  estado: 'COMPLETADA',
  fecha: '2026-10-19T09:15:00',
  subtotal: 2.26,
  descuento: 0,
  total: 2.55,
  aplicaIva: true,
  ivaIncluido: false,
  tasaIvaAplicada: 13,
  ventasGravadas: 2.26,
  ventasExentas: 0,
  iva: 0.29,
  detalles: [
    { id: 1, productoId: 1, producto: 'Pan dulce', cantidad: 2, precio: 1.13, descuento: 0, subtotal: 2.26, exento: false, precioUnitarioSinIva: 1.13 },
  ],
};

describe('Cobro con IVA no incluido (HU-36)', () => {
  let fixture: ComponentFixture<CheckoutDialog>;
  let httpMock: HttpTestingController;
  let stale: number;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
        {
          provide: CardTerminal,
          useValue: { status: signal('desconectado'), connect: () => Promise.resolve(), charge: () => of() },
        },
        { provide: TicketPrinter, useValue: { print: (lines: string[]) => of(...lines) } },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(CheckoutDialog);
    fixture.componentRef.setInput('lines', LINES);
    fixture.componentRef.setInput('total', 2.55);
    fixture.componentRef.setInput('quote', QUOTE_SUMADO);
    fixture.componentRef.setInput('cashier', 'Ana');
    stale = 0;
    fixture.componentInstance.staleTotal.subscribe(() => stale++);
    fixture.detectChanges();
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
  });

  const html = () => fixture.nativeElement as HTMLElement;
  const text = () => html().textContent ?? '';

  function typeCash(value: string): void {
    const input = html().querySelector<HTMLInputElement>('#checkout-cash')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  const confirmButton = () =>
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.includes('Confirmar venta'))!;

  it('muestra el desglose de la cotización: subtotal, IVA sumado y el total a cobrar del servidor', () => {
    expect(text()).toContain('$2.55');
    expect(text()).toContain('Subtotal');
    expect(text()).toContain('$2.26');
    expect(text()).toContain('IVA (13 %)');
    expect(text()).toContain('+$0.29');
    expect(text()).not.toContain('IVA incluido');
  });

  it('con IVA incluido el IVA se muestra como informativo', () => {
    fixture.componentRef.setInput('quote', { ...QUOTE_SUMADO, ivaIncluido: true, total: 2.26, iva: 0.26 });
    fixture.componentRef.setInput('total', 2.26);
    fixture.detectChanges();

    expect(text()).toContain('IVA incluido (13 %)');
    expect(text()).toContain('$0.26');
    expect(text()).not.toContain('+$0.26');
  });

  it('el efectivo se valida contra el total con IVA, no contra la suma de precios', () => {
    typeCash('2.26'); // alcanza para los precios pero no para el total con IVA

    expect(text()).toContain('Falta');
    expect(text()).toContain('$0.29');
    expect(confirmButton().disabled).toBe(true);
  });

  it('el cambio se calcula sobre el total con IVA', () => {
    typeCash('5');

    expect(text()).toContain('Cambio');
    expect(text()).toContain('$2.45');
    expect(confirmButton().disabled).toBe(false);
  });

  it('"Exacto" completa el total con IVA', () => {
    Array.from(html().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Exacto')!.click();
    fixture.detectChanges();

    expect(html().querySelector<HTMLInputElement>('#checkout-cash')!.value).toBe('2.55');
  });

  it('al confirmar envía el total que vio el cajero y arma el ticket con el desglose guardado en la venta', () => {
    vi.useFakeTimers();
    typeCash('5');
    confirmButton().click();
    fixture.detectChanges();

    const request = httpMock.expectOne(SALE_URL);
    expect(request.request.body).toMatchObject({
      lineas: [{ productoId: 1, cantidad: 2 }],
      totalEsperado: 2.55,
    });
    request.flush(SALE);
    // la venta tarda un mínimo en "procesarse" y luego se imprime
    vi.advanceTimersByTime(3_000);
    fixture.detectChanges();

    // "Imprimir" manda a la impresión del navegador el mismo ticket, fuera del diálogo
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    const imprimir = [...html().querySelectorAll('button')].find((b) => b.textContent?.includes('Imprimir'));
    imprimir!.click();
    const root = document.getElementById('receipt-print-root')!;
    const ticket = root.textContent!;
    expect(print).toHaveBeenCalledTimes(1);
    expect(root.parentElement).toBe(document.body);
    root.remove();
    print.mockRestore();
    expect(ticket).toContain('IVA (13%)');
    expect(ticket).toMatch(/TOTAL A PAGAR\s+\$2\.55/);
    expect(ticket).toMatch(/VENTAS GRAVADAS\s+2\.26/);
  });

  it('el crédito fiscal envía los datos opcionales del receptor y la reimpresión repite los datos DTE del ticket', () => {
    vi.useFakeTimers();
    const button = (label: string) =>
      [...html().querySelectorAll('button')].find((b) => b.textContent?.trim() === label)!;
    const type = (label: string, value: string) => {
      const input = html().querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    button('Crédito fiscal').click();
    fixture.detectChanges();
    type('Nombre del receptor', 'Distribuidora, S.A. de C.V.');
    type('Documento del receptor', '0614-010190-101-3');
    type('NRC del receptor', '123456-7');
    type('Dirección del receptor', ' Calle Arce 123 ');
    type('Teléfono del receptor', '2222-3333');
    fixture.detectChanges();
    typeCash('5');
    confirmButton().click();
    fixture.detectChanges();

    const request = httpMock.expectOne(SALE_URL);
    expect(request.request.body).toMatchObject({
      tipoDte: '03',
      receptorNrc: '123456-7',
      receptorDireccion: 'Calle Arce 123',
      receptorTelefono: '2222-3333',
    });
    expect(request.request.body.receptorDescActividad).toBeUndefined();
    const ccf: Sale = {
      ...SALE,
      tipoDte: '03',
      numeroControl: 'DTE-03-M001P001-000000000000007',
      codigoGeneracion: '0F1E2D3C-4B5A-4978-8695-A4B3C2D1E0F9',
      receptorNombre: 'Distribuidora, S.A. de C.V.',
      totalLetras: 'DOS 55/100 DÓLARES',
    };
    request.flush(ccf);
    vi.advanceTimersByTime(3_000);
    fixture.detectChanges();

    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    [...html().querySelectorAll('button')].find((b) => b.textContent?.includes('Imprimir'))!.click();
    const root = document.getElementById('receipt-print-root')!;
    const original = root.textContent!.split('\n');
    root.remove();
    print.mockRestore();

    // Encabezado del documento: entre la primera y la segunda línea divisoria.
    const rule = '-'.repeat(RECEIPT_WIDTH);
    const header = (lines: readonly string[]) => {
      const first = lines.indexOf(rule);
      return lines.slice(first + 1, lines.indexOf(rule, first + 1));
    };
    const reprint = formatReceipt(saleToReceipt(ccf), TestBed.inject(CompanyStore).info());
    const originalHeader = header(original).join(' ');
    expect(originalHeader).toContain('COMPROBANTE DE CREDITO FISCAL');
    expect(originalHeader).toContain('No. control: DTE-03-M001P001-000000000000007');
    expect(originalHeader).toContain('Cod. gen.: 0F1E2D3C-4B5A-4978-8695-A4B3C2D1E0F9');
    expect(originalHeader).toContain('Cliente: Distribuidora, S.A. de C.V.');
    expect(header(reprint)).toEqual(header(original));
    expect(original).toContain('SON: DOS 55/100 DÓLARES');
    expect(reprint).toContain('SON: DOS 55/100 DÓLARES');
  });

  it('si el servidor recalculó otro total (409 TOTAL_CAMBIO) avisa para volver a cotizar y no registra la venta', () => {
    typeCash('5');
    confirmButton().click();
    fixture.detectChanges();

    httpMock.expectOne(SALE_URL).flush(
      { message: 'El total cambió de $2.55 a $2.26 (cambiaron los precios, las promociones o el IVA).', code: 'TOTAL_CAMBIO' },
      { status: 409, statusText: 'Conflict' },
    );
    fixture.detectChanges();

    expect(stale).toBe(1);
    expect(text()).toContain('El total cambió de $2.55 a $2.26');
    // vuelve al cobro para que el cajero revise el total nuevo
    expect(html().querySelector('#checkout-cash')).not.toBeNull();
  });
});
