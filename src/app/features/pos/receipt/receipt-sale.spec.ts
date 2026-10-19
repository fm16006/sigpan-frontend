import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG } from '../../../core/config/api.config';
import { Sale } from '../../../core/models/order.model';
import { CompanyStore } from '../../../core/services/company-store';
import { saleToReceipt } from '../pos-pedidos-logic';
import { formatReceipt } from './receipt-format';

/** Venta registrada cuando el IVA era 13 % incluido: 2 × $1.13 gravado + $1.00 exento. */
const OLD_SALE: Sale = {
  id: 77,
  usuarioId: 8,
  usuario: 'Ana',
  sucursal: 'Principal',
  caja: 'Caja 01',
  tipo: 'MOSTRADOR',
  estado: 'COMPLETADA',
  fecha: '2026-10-19T09:15:00',
  subtotal: 3.26,
  descuento: 0,
  total: 3.26,
  aplicaIva: true,
  ivaIncluido: true,
  tasaIvaAplicada: 13,
  ventasGravadas: 2,
  ventasExentas: 1,
  iva: 0.26,
  detalles: [
    { id: 1, productoId: 1, producto: 'Pan dulce', cantidad: 2, precio: 1.13, descuento: 0, subtotal: 2.26, exento: false, precioUnitarioSinIva: 1 },
    { id: 2, productoId: 2, producto: 'Libreta', cantidad: 1, precio: 1, descuento: 0, subtotal: 1, exento: true, precioUnitarioSinIva: 1 },
  ],
};

describe('reimpresión de una venta registrada (HU-36)', () => {
  let company: CompanyStore;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        {
          provide: API_CONFIG,
          useValue: { baseUrl: 'https://api.test/api/v1', origin: 'https://api.test', timeoutMs: 5000 },
        },
      ],
    });
    company = TestBed.inject(CompanyStore);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function loadCompany(tax: { aplicaIva: boolean; ivaIncluido: boolean; tasaIva: number }): void {
    company.load();
    httpMock.expectOne('https://api.test/api/v1/empresa').flush({
      razonSocial: 'SigPan, S.A. de C.V.',
      nombreComercial: 'Pan Nuevo',
      nit: '0614-010190-101-3',
      nrc: '123456-7',
      giro: 'Panadería',
      direccion: 'Santa Tecla',
      telefono: '2222-3333',
      correo: null,
      ...tax,
      logoUrl: null,
      actualizadoEn: null,
    });
  }

  it('usa la tasa y el modo guardados en la venta aunque la empresa tenga otra configuración', () => {
    loadCompany({ aplicaIva: true, ivaIncluido: false, tasaIva: 16 });
    expect(company.tax()).toEqual({ aplicaIva: true, ivaIncluido: false, tasaIva: 16 });

    const text = formatReceipt(saleToReceipt(OLD_SALE), company.info());
    const row = (start: string) => text.find((line) => line.startsWith(start))?.trim() ?? '';

    expect(row('IVA INCLUIDO (13%)').endsWith('0.26')).toBe(true);
    expect(row('TOTAL A PAGAR').endsWith('$3.26')).toBe(true);
    expect(row('VENTAS GRAVADAS').endsWith('2.26')).toBe(true);
    expect(text.some((line) => line.includes('16%'))).toBe(false);
    expect(text.some((line) => line.startsWith('IVA ('))).toBe(false);
  });

  it('una venta guardada sin IVA se reimprime sin IVA aunque la empresa ahora lo aplique', () => {
    loadCompany({ aplicaIva: true, ivaIncluido: true, tasaIva: 13 });
    const noTax: Sale = { ...OLD_SALE, aplicaIva: false, ventasGravadas: 0, ventasExentas: 3.26, iva: 0 };

    const text = formatReceipt(saleToReceipt(noTax), company.info());

    expect(text.some((line) => line.includes('IVA'))).toBe(false);
  });

  it('el precio sin IVA de cada línea sale de lo guardado en la venta', () => {
    const receipt = saleToReceipt(OLD_SALE);

    expect(receipt.lineas[0]).toMatchObject({ precioSinIva: 1, importeSinIva: 2, exento: false });
    expect(receipt.lineas[1]).toMatchObject({ precioSinIva: 1, importeSinIva: 1, exento: true });
    expect(receipt.impuestos).toMatchObject({ ivaIncluido: true, tasa: 13, ventasGravadas: 2, iva: 0.26 });
  });

  it('una venta con IVA no incluido guardada se reimprime con su propio modo', () => {
    loadCompany({ aplicaIva: true, ivaIncluido: true, tasaIva: 13 });
    const noIncluded: Sale = {
      ...OLD_SALE,
      total: 3.55,
      ivaIncluido: false,
      ventasGravadas: 2.26,
      ventasExentas: 1,
      iva: 0.29,
      detalles: OLD_SALE.detalles!.map((line) => ({ ...line, precioUnitarioSinIva: line.precio })),
    };

    const text = formatReceipt(saleToReceipt(noIncluded), company.info());

    expect(text.find((line) => line.startsWith('IVA ('))?.trim().endsWith('0.29')).toBe(true);
    expect(text.find((line) => line.startsWith('TOTAL A PAGAR'))?.trim().endsWith('$3.55')).toBe(true);
  });
});
