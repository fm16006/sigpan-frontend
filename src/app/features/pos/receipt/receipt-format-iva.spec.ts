import { BUSINESS_INFO } from '../../../core/config/business.config';
import { Receipt } from '../models/checkout.model';
import { RECEIPT_WIDTH, formatReceipt } from './receipt-format';

/** Dos productos gravados de $1.13 (una línea de 2) y uno exento de $1.00. */
const mixed: Receipt = {
  numero: 123,
  fecha: new Date(2026, 9, 13, 8, 5),
  cajero: 'Ana',
  caja: 'Caja 01',
  documento: 'TICKET',
  metodo: 'EFECTIVO',
  lineas: [
    { cantidad: 2, descripcion: 'Pan dulce', precio: 1.13, importe: 2.26, exento: false, precioSinIva: 1, importeSinIva: 2 },
    { cantidad: 1, descripcion: 'Libreta', precio: 1, importe: 1, exento: true, precioSinIva: 1, importeSinIva: 1 },
  ],
  subtotal: 3.26,
  descuento: 0,
  impuestos: { aplicaIva: true, ivaIncluido: true, tasa: 13, ventasGravadas: 2, ventasExentas: 1, iva: 0.26 },
  total: 3.26,
  recibido: 5,
  cambio: 1.74,
  tarjeta: null,
};

const row = (text: string[], start: string) => text.find((line) => line.startsWith(start))?.trim();
const ends = (text: string[], start: string, value: string) => row(text, start)?.endsWith(value) ?? false;

describe('formatReceipt: desglose del IVA guardado con la venta (HU-36)', () => {
  it('consumidor final con IVA incluido: el total no sube y el IVA se informa aparte', () => {
    const text = formatReceipt(mixed, BUSINESS_INFO);

    expect(ends(text, 'SUMAS', '3.26')).toBe(true);
    expect(ends(text, 'VENTAS EXENTAS', '1.00')).toBe(true);
    // las ventas gravadas del consumidor final llevan el IVA adentro: 2.00 + 0.26
    expect(ends(text, 'VENTAS GRAVADAS', '2.26')).toBe(true);
    expect(ends(text, 'TOTAL A PAGAR', '$3.26')).toBe(true);
    expect(ends(text, 'IVA INCLUIDO (13%)', '0.26')).toBe(true);
    expect(row(text, 'IVA (')).toBeUndefined();
    expect(text.every((line) => line.length <= RECEIPT_WIDTH)).toBe(true);
  });

  it('consumidor final con IVA no incluido: el IVA se suma y el total lo trae', () => {
    const text = formatReceipt(
      {
        ...mixed,
        total: 3.55,
        impuestos: { ...mixed.impuestos, ivaIncluido: false, ventasGravadas: 2.26, iva: 0.29 },
      },
      BUSINESS_INFO,
    );

    expect(ends(text, 'VENTAS GRAVADAS', '2.26')).toBe(true);
    expect(ends(text, 'IVA (13%)', '0.29')).toBe(true);
    expect(ends(text, 'TOTAL A PAGAR', '$3.55')).toBe(true);
    expect(row(text, 'IVA INCLUIDO')).toBeUndefined();
  });

  it('la factura de consumidor final se comporta como el ticket', () => {
    const text = formatReceipt({ ...mixed, documento: 'FACTURA' }, BUSINESS_INFO);

    expect(text.some((line) => line.startsWith('FACTURA No.'))).toBe(true);
    expect(ends(text, 'IVA INCLUIDO (13%)', '0.26')).toBe(true);
  });

  it('si la empresa no aplicaba IVA no muestra ninguna línea de IVA', () => {
    const text = formatReceipt(
      {
        ...mixed,
        impuestos: { aplicaIva: false, ivaIncluido: true, tasa: 13, ventasGravadas: 0, ventasExentas: 3.26, iva: 0 },
      },
      BUSINESS_INFO,
    );

    expect(text.some((line) => line.includes('IVA'))).toBe(false);
    expect(text.some((line) => line.startsWith('VENTAS GRAVADAS'))).toBe(false);
    expect(ends(text, 'TOTAL A PAGAR', '$3.26')).toBe(true);
  });

  it('usa la tasa guardada en la venta, no una fija', () => {
    const text = formatReceipt({ ...mixed, impuestos: { ...mixed.impuestos, tasa: 16.5 } }, BUSINESS_INFO);

    expect(row(text, 'IVA INCLUIDO (16.5%)')).toBeDefined();
    expect(text.some((line) => line.includes('13%'))).toBe(false);
  });

  it('muestra los descuentos como línea aparte', () => {
    const text = formatReceipt({ ...mixed, subtotal: 4, descuento: 0.74, total: 3.26 }, BUSINESS_INFO);

    expect(ends(text, 'SUMAS', '4.00')).toBe(true);
    expect(ends(text, 'DESCUENTOS', '-0.74')).toBe(true);
  });

  it('crédito fiscal: precio unitario sin IVA, suma gravada, IVA por separado y total', () => {
    const text = formatReceipt({ ...mixed, documento: 'CCF' }, BUSINESS_INFO);

    expect(text.some((line) => line.startsWith('COMPROBANTE DE CREDITO FISCAL No.'))).toBe(true);
    expect(text.some((line) => line.includes('Precios unitarios sin IVA'))).toBe(true);
    expect(text.find((line) => line.includes('Pan dulce'))?.trim()).toMatch(/^2\s+Pan dulce\s+1\.00\s+2\.00$/);
    expect(ends(text, 'SUMA GRAVADA (SIN IVA)', '2.00')).toBe(true);
    expect(ends(text, 'VENTAS EXENTAS', '1.00')).toBe(true);
    expect(ends(text, 'IVA (13%)', '0.26')).toBe(true);
    expect(ends(text, 'TOTAL A PAGAR', '$3.26')).toBe(true);
    expect(row(text, 'IVA INCLUIDO')).toBeUndefined();
    expect(text.every((line) => line.length <= RECEIPT_WIDTH)).toBe(true);
  });

  it('crédito fiscal con IVA no incluido: el precio unitario es el publicado y el total suma el IVA', () => {
    const text = formatReceipt(
      {
        ...mixed,
        documento: 'CCF',
        lineas: [{ cantidad: 2, descripcion: 'Pan dulce', precio: 1, importe: 2, exento: false, precioSinIva: 1, importeSinIva: 2 }],
        subtotal: 2,
        total: 2.26,
        impuestos: { aplicaIva: true, ivaIncluido: false, tasa: 13, ventasGravadas: 2, ventasExentas: 0, iva: 0.26 },
      },
      BUSINESS_INFO,
    );

    expect(text.find((line) => line.includes('Pan dulce'))?.trim()).toMatch(/1\.00\s+2\.00$/);
    expect(ends(text, 'IVA (13%)', '0.26')).toBe(true);
    expect(ends(text, 'TOTAL A PAGAR', '$2.26')).toBe(true);
  });

  it('crédito fiscal con descuento: lo muestra para que las cifras cuadren', () => {
    const text = formatReceipt(
      {
        ...mixed,
        documento: 'CCF',
        impuestos: { aplicaIva: true, ivaIncluido: true, tasa: 13, ventasGravadas: 1.5, ventasExentas: 1, iva: 0.2 },
        total: 2.7,
      },
      BUSINESS_INFO,
    );

    expect(ends(text, 'SUMAS', '3.00')).toBe(true);
    expect(ends(text, 'DESCUENTOS', '-0.50')).toBe(true);
    expect(ends(text, 'SUMA GRAVADA (SIN IVA)', '1.50')).toBe(true);
  });

  it('crédito fiscal sin IVA en la empresa: no muestra líneas de IVA', () => {
    const text = formatReceipt(
      {
        ...mixed,
        documento: 'CCF',
        impuestos: { aplicaIva: false, ivaIncluido: true, tasa: 13, ventasGravadas: 0, ventasExentas: 3.26, iva: 0 },
      },
      BUSINESS_INFO,
    );

    expect(text.some((line) => line.includes('IVA'))).toBe(false);
    expect(ends(text, 'TOTAL A PAGAR', '$3.26')).toBe(true);
  });

  it('precio sin IVA con decimales de más usa hasta cuatro', () => {
    const text = formatReceipt(
      {
        ...mixed,
        documento: 'CCF',
        lineas: [{ cantidad: 1, descripcion: 'Concha', precio: 0.5, importe: 0.5, exento: false, precioSinIva: 0.4425, importeSinIva: 0.44 }],
        subtotal: 0.5,
        total: 0.5,
        impuestos: { aplicaIva: true, ivaIncluido: true, tasa: 13, ventasGravadas: 0.44, ventasExentas: 0, iva: 0.06 },
      },
      BUSINESS_INFO,
    );

    expect(text.find((line) => line.includes('Concha'))?.trim()).toMatch(/0\.4425\s+0\.44$/);
  });
});
