import { BusinessInfo } from '../../../core/config/business.config';
import { Receipt } from '../models/checkout.model';

export const RECEIPT_WIDTH = 40;
export const IVA_RATE = 0.13;

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
  const center = (text: string) => centerText(text, width);
  const row = (left: string, right: string) => spread(left, right, width);
  const iva = receipt.total - receipt.total / (1 + IVA_RATE);

  return [
    center(business.nombreComercial.toUpperCase()),
    center(business.razonSocial),
    center(business.giro),
    center(business.direccion),
    ...(receipt.sucursal ? [center(`Sucursal: ${receipt.sucursal}`)] : []),
    center(`NIT: ${business.nit}`),
    center(`NRC: ${business.nrc}  Tel. ${business.telefono}`),
    rule,
    row(
      `${DOCUMENT_TITLES[receipt.documento]} No. ${pad(receipt.numero)}`,
      receipt.caja,
    ),
    row(
      `Fecha: ${DATE_FORMAT.format(receipt.fecha)}`,
      `Hora: ${TIME_FORMAT.format(receipt.fecha)}`,
    ),
    fit(`Cajero: ${receipt.cajero}`, width),
    rule,
    itemRow('CANT', 'DESCRIPCION', 'P.UNIT', 'TOTAL', width),
    ...receipt.lineas.map((line) =>
      itemRow(
        String(line.cantidad),
        line.descripcion,
        money(line.precio),
        money(line.importe),
        width,
      ),
    ),
    rule,
    row('SUMAS', money(receipt.total)),
    row('VENTAS EXENTAS', money(0)),
    row('VENTAS GRAVADAS', money(receipt.total)),
    row('TOTAL A PAGAR', `$${money(receipt.total)}`),
    row('IVA INCLUIDO (13%)', money(iva)),
    rule,
    ...(receipt.tarjeta
      ? [
          row(`TARJETA ${receipt.tarjeta.marca}`, money(receipt.total)),
          row(`**** **** **** ${receipt.tarjeta.ultimos}`, 'SIN CONTACTO'),
          row(`AUT. ${receipt.tarjeta.autorizacion}`, 'APROBADA'),
        ]
      : [row(receipt.metodo, money(receipt.recibido)), row('CAMBIO', money(receipt.cambio))]),
    rule,
    center('GRACIAS POR SU COMPRA'),
    center('Conserve su ticket para reclamos'),
  ];
}

function itemRow(qty: string, description: string, price: string, total: string, width: number) {
  const qtyWidth = 4;
  const priceWidth = 7;
  const totalWidth = 8;
  const descriptionWidth = width - qtyWidth - priceWidth - totalWidth - 3;
  return [
    qty.padStart(qtyWidth),
    fit(description, descriptionWidth).padEnd(descriptionWidth),
    price.padStart(priceWidth),
    total.padStart(totalWidth),
  ].join(' ');
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
