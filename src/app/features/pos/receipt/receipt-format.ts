import { BusinessInfo } from '../../../core/config/business.config';
import { Receipt } from '../models/checkout.model';

export const RECEIPT_WIDTH = 40;

const DATE_FORMAT = new Intl.DateTimeFormat('es-SV', {
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});
const TIME_FORMAT = new Intl.DateTimeFormat('es-SV', {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

const DOCUMENT_TITLES: Readonly<Record<Receipt['documento'], string>> = {
  TICKET: 'TICKET',
  CCF: 'COMPROBANTE DE CREDITO FISCAL',
  FACTURA: 'FACTURA',
};

export function formatReceipt(
  receipt: Receipt,
  business: BusinessInfo,
  width = RECEIPT_WIDTH,
): string[] {
  const rule = '-'.repeat(width);
  // Las líneas largas (giro, dirección, nombres de producto) siguen en la línea de abajo: no se recortan.
  const center = (text: string) => wrapWords(text, width).map((line) => centerText(line, width));
  const row = (left: string, right: string) => spread(left, right, width);
  const tax = receipt.impuestos;
  const creditNote = receipt.documento === 'CCF' && tax.aplicaIva;

  return [
    ...center(business.nombreComercial.toUpperCase()),
    ...center(business.razonSocial),
    ...center(business.giro),
    ...center(business.direccion),
    ...center(`NIT: ${business.nit}`),
    ...center(`NRC: ${business.nrc}  Tel. ${business.telefono}`),
    rule,
    row(
      `${DOCUMENT_TITLES[receipt.documento]} No. ${pad(receipt.numero)}`,
      receipt.caja,
    ),
    row(
      `Fecha: ${DATE_FORMAT.format(receipt.fecha)}`,
      `Hora: ${TIME_FORMAT.format(receipt.fecha)}`,
    ),
    ...wrapWords(`Cajero: ${receipt.cajero}`, width),
    ...(receipt.numeroControl ? wrapWords(`No. control: ${receipt.numeroControl}`, width) : []),
    ...(receipt.codigoGeneracion ? wrapWords(`Cod. gen.: ${receipt.codigoGeneracion}`, width) : []),
    ...(receipt.receptor ? wrapWords(`Cliente: ${receipt.receptor}`, width) : []),
    rule,
    ...(creditNote ? center('Precios unitarios sin IVA') : []),
    ...itemRow('CANT', 'DESCRIPCION', 'P.UNIT', 'TOTAL', width),
    ...receipt.lineas.flatMap((line) =>
      creditNote
        ? itemRow(
            String(line.cantidad),
            line.descripcion,
            unitPrice(line.precioSinIva ?? line.precio),
            money(line.importeSinIva ?? line.importe),
            width,
          )
        : itemRow(
            String(line.cantidad),
            line.descripcion,
            money(line.precio),
            money(line.importe),
            width,
          ),
    ),
    rule,
    ...(creditNote ? creditNoteTotals(receipt, row) : consumerTotals(receipt, row)),
    rule,
    ...withRule(paymentRows(receipt, row), rule),
    ...(receipt.anulada ? [...center('*** VENTA ANULADA ***'), rule] : []),
    ...center('GRACIAS POR SU COMPRA'),
    ...center('Conserve su ticket para reclamos'),
  ];
}

/** Un bloque de filas y su línea de cierre; si no hay filas, ninguna de las dos. */
function withRule(rows: string[], rule: string): string[] {
  return rows.length > 0 ? [...rows, rule] : rows;
}

function paymentRows(receipt: Receipt, row: (left: string, right: string) => string): string[] {
  if (receipt.tarjeta && receipt.metodo === 'MIXTO') {
    return [
      row(`TARJETA ${receipt.tarjeta.marca}`, money(receipt.montoTarjeta ?? 0)),
      row(`AUT. ${receipt.tarjeta.autorizacion}`, 'APROBADA'),
      row('EFECTIVO', money(receipt.recibido)),
      row('CAMBIO', money(receipt.cambio)),
    ];
  }
  if (receipt.tarjeta) {
    return [
      row(`TARJETA ${receipt.tarjeta.marca}`, money(receipt.total)),
      row(`**** **** **** ${receipt.tarjeta.ultimos}`, 'SIN CONTACTO'),
      row(`AUT. ${receipt.tarjeta.autorizacion}`, 'APROBADA'),
    ];
  }
  if (receipt.sinDetallePago) {
    return [];
  }
  return [row(receipt.metodo, money(receipt.recibido)), row('CAMBIO', money(receipt.cambio))];
}

/** Fila de producto; si la descripción no cabe, sigue debajo, alineada con su columna. */
function itemRow(qty: string, description: string, price: string, total: string, width: number): string[] {
  const qtyWidth = 4;
  const priceWidth = 7;
  const totalWidth = 8;
  const descriptionWidth = width - qtyWidth - priceWidth - totalWidth - 3;
  const [first, ...rest] = wrapWords(description, descriptionWidth);
  return [
    [
      qty.padStart(qtyWidth),
      (first ?? '').padEnd(descriptionWidth),
      price.padStart(priceWidth),
      total.padStart(totalWidth),
    ].join(' '),
    ...rest.map((line) => ' '.repeat(qtyWidth + 1) + line),
  ];
}

/** Parte el texto en líneas de hasta `width` caracteres, entre palabras; una palabra más larga se corta. */
export function wrapWords(text: string, width: number): string[] {
  const lines: string[] = [];
  let current = '';
  for (const word of text.trim().split(/\s+/)) {
    for (let piece = word; piece; piece = piece.slice(width)) {
      const chunk = piece.slice(0, width);
      if (!current) current = chunk;
      else if (current.length + 1 + chunk.length <= width) current += ' ' + chunk;
      else {
        lines.push(current);
        current = chunk;
      }
    }
  }
  return current ? [...lines, current] : lines.length ? lines : [''];
}

function centerText(text: string, width: number): string {
  const value = fit(text, width);
  return ' '.repeat(Math.floor((width - value.length) / 2)) + value;
}

function spread(left: string, right: string, width: number): string {
  const space = Math.max(1, width - left.length - right.length);
  return fit(left + ' '.repeat(space) + right, width);
}

function fit(text: string, width: number): string {
  return text.length > width ? text.slice(0, width) : text;
}

function pad(value: number): string {
  return String(value).padStart(6, '0');
}

function money(value: number): string {
  return Number(value).toFixed(2);
}

/** "13%", "16.5%". */
function rateText(rate: number): string {
  return `${Number(Number(rate).toFixed(2))}%`;
}

/**
 * Totales del ticket de consumidor final (TICKET y FACTURA). Todo sale del desglose guardado con
 * la venta: con IVA incluido las ventas gravadas llevan el IVA dentro y este se informa aparte;
 * con IVA no incluido se suma. Si la empresa no aplicaba IVA no hay ninguna línea de IVA.
 */
function consumerTotals(receipt: Receipt, row: (left: string, right: string) => string): string[] {
  const tax = receipt.impuestos;
  const rows = [row('SUMAS', money(receipt.subtotal))];
  if (receipt.descuento > 0) {
    rows.push(row('DESCUENTOS', `-${money(receipt.descuento)}`));
  }
  if (tax.aplicaIva) {
    rows.push(row('VENTAS EXENTAS', money(tax.ventasExentas)));
    rows.push(
      row('VENTAS GRAVADAS', money(tax.ivaIncluido ? tax.ventasGravadas + tax.iva : tax.ventasGravadas)),
    );
    if (!tax.ivaIncluido) {
      rows.push(row(`IVA (${rateText(tax.tasa)})`, money(tax.iva)));
    }
  }
  rows.push(row('TOTAL A PAGAR', `$${money(receipt.total)}`));
  if (tax.aplicaIva && tax.ivaIncluido) {
    rows.push(row(`IVA INCLUIDO (${rateText(tax.tasa)})`, money(tax.iva)));
  }
  return rows;
}

/** Totales del comprobante de crédito fiscal: suma gravada sin IVA, IVA por separado y total. */
function creditNoteTotals(receipt: Receipt, row: (left: string, right: string) => string): string[] {
  const tax = receipt.impuestos;
  const lineSum = receipt.lineas.reduce((sum, line) => sum + (line.importeSinIva ?? line.importe), 0);
  const discount = Math.round((lineSum - tax.ventasGravadas - tax.ventasExentas) * 100) / 100;
  const rows: string[] = [];
  if (discount >= 0.01) {
    rows.push(row('SUMAS', money(lineSum)), row('DESCUENTOS', `-${money(discount)}`));
  }
  rows.push(
    row('SUMA GRAVADA (SIN IVA)', money(tax.ventasGravadas)),
    row('VENTAS EXENTAS', money(tax.ventasExentas)),
    row(`IVA (${rateText(tax.tasa)})`, money(tax.iva)),
    row('TOTAL A PAGAR', `$${money(receipt.total)}`),
  );
  return rows;
}

/** Precio unitario: dos decimales, y hasta cuatro cuando el precio sin IVA los necesita. */
function unitPrice(value: number): string {
  const long = Number(value).toFixed(4);
  const text = long.endsWith('00') ? Number(value).toFixed(2) : long.replace(/0$/, '');
  return text.length > 7 ? Number(value).toFixed(2) : text;
}
