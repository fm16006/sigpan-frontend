import { BUSINESS_INFO } from '../../../core/config/business.config';
import { Receipt } from '../models/checkout.model';
import { RECEIPT_WIDTH, formatReceipt, wrapWords } from './receipt-format';

const receipt: Receipt = {
  numero: 123,
  fecha: new Date(2026, 9, 13, 8, 5),
  cajero: 'Ana',
  caja: 'Caja 01',
  documento: 'TICKET',
  metodo: 'EFECTIVO',
  lineas: [
    { cantidad: 4, descripcion: 'Pan francés', precio: 0.25, importe: 1 },
    {
      cantidad: 1,
      descripcion: 'Pastel de tres leches con fresas grande',
      precio: 12.5,
      importe: 12.5,
    },
  ],
  subtotal: 13.5,
  descuento: 0,
  impuestos: {
    aplicaIva: true,
    ivaIncluido: true,
    tasa: 13,
    ventasGravadas: 11.95,
    ventasExentas: 0,
    iva: 1.55,
  },
  total: 13.5,
  recibido: 20,
  cambio: 6.5,
  tarjeta: null,
};

describe('formatReceipt', () => {
  const lines = formatReceipt(receipt, BUSINESS_INFO);

  it('ninguna línea supera el ancho del papel', () => {
    expect(lines.every((line) => line.length <= RECEIPT_WIDTH)).toBe(true);
  });

  it('no recorta los textos largos: siguen en la línea de abajo', () => {
    const empresa = {
      ...BUSINESS_INFO,
      giro: 'Elaboración y venta de productos de panadería y pastelería',
      direccion: 'Calle Arce y 19 Av. Norte #1120, San Salvador, El Salvador',
    };
    const ticket = formatReceipt(receipt, empresa);
    const texto = ticket.map((line) => line.trim()).join(' ');

    expect(ticket.every((line) => line.length <= RECEIPT_WIDTH)).toBe(true);
    expect(texto).toContain('Elaboración y venta de productos de panadería y pastelería');
    expect(texto).toContain('Calle Arce y 19 Av. Norte #1120, San Salvador, El Salvador');
    // la descripción del producto sigue debajo, alineada con su columna, y el precio queda en la primera línea
    const fila = ticket.findIndex((line) => line.includes('Pastel de tres'));
    expect(ticket[fila].trimEnd().endsWith('12.50')).toBe(true);
    expect(ticket[fila + 1]).toMatch(/^ {5}\S/);
    // columna de descripción: después de la cantidad (5) y con 18 caracteres de ancho
    const descripcion = ticket.slice(fila, fila + 3).map((line) => line.slice(5, 23).trim());
    expect(descripcion.join(' ')).toBe('Pastel de tres leches con fresas grande');
  });

  it('wrapWords parte entre palabras y corta solo las palabras más largas que la línea', () => {
    expect(wrapWords('uno dos tres', 7)).toEqual(['uno dos', 'tres']);
    expect(wrapWords('supercalifragilístico', 8)).toEqual(['supercal', 'ifragilí', 'stico']);
    expect(wrapWords('', 8)).toEqual(['']);
  });

  it('muestra la caja donde se cobró y no la sucursal', () => {
    expect(lines.some((line) => line.trim().startsWith('Sucursal:'))).toBe(false);
    expect(lines.some((line) => line.startsWith('TICKET No.') && line.trimEnd().endsWith('Caja 01'))).toBe(true);

    const otra = formatReceipt({ ...receipt, caja: 'Caja 02' }, BUSINESS_INFO);
    expect(otra.some((line) => line.endsWith('Caja 02'))).toBe(true);
  });

  it('numera el ticket con ceros a la izquierda', () => {
    expect(lines.some((line) => line.includes('TICKET No. 000123'))).toBe(true);
  });

  it('desglosa el IVA incluido en el total', () => {
    const iva = lines.find((line) => line.startsWith('IVA INCLUIDO'));
    expect(iva?.trim().endsWith('1.55')).toBe(true);
  });

  it('muestra el efectivo recibido y el cambio', () => {
    expect(
      lines
        .find((line) => line.startsWith('EFECTIVO'))
        ?.trim()
        .endsWith('20.00'),
    ).toBe(true);
    expect(
      lines
        .find((line) => line.startsWith('CAMBIO'))
        ?.trim()
        .endsWith('6.50'),
    ).toBe(true);
  });

  it('con tarjeta muestra marca, últimos dígitos y autorización, sin cambio', () => {
    const card = formatReceipt(
      {
        ...receipt,
        metodo: 'TARJETA',
        recibido: 13.5,
        cambio: 0,
        tarjeta: { uid: 'A1B2C3D4', marca: 'VISA', ultimos: '7364', autorizacion: '048213' },
      },
      BUSINESS_INFO,
    );
    const line = (start: string) => card.find((text) => text.startsWith(start))?.trim();

    expect(line('TARJETA VISA')?.endsWith('13.50')).toBe(true);
    expect(line('**** **** **** 7364')?.endsWith('SIN CONTACTO')).toBe(true);
    expect(line('AUT. 048213')?.endsWith('APROBADA')).toBe(true);
    expect(card.some((text) => text.startsWith('CAMBIO'))).toBe(false);
    expect(card.every((text) => text.length <= RECEIPT_WIDTH)).toBe(true);
  });

  it('sin detalle de pago omite recibido y cambio, sin dejar líneas dobles', () => {
    const past = formatReceipt({ ...receipt, sinDetallePago: true }, BUSINESS_INFO);

    expect(past.some((text) => text.startsWith('EFECTIVO'))).toBe(false);
    expect(past.some((text) => text.startsWith('CAMBIO'))).toBe(false);
    const rule = '-'.repeat(RECEIPT_WIDTH);
    expect(past.some((text, index) => text === rule && past[index + 1] === rule)).toBe(false);
    expect(past.some((text) => text.includes('TOTAL A PAGAR'))).toBe(true);
  });

  it('una venta anulada lo dice en el ticket', () => {
    const voided = formatReceipt({ ...receipt, anulada: true }, BUSINESS_INFO);

    expect(voided.some((text) => text.includes('VENTA ANULADA'))).toBe(true);
    expect(lines.some((text) => text.includes('VENTA ANULADA'))).toBe(false);
  });
});
