import { Sale } from '../../../core/models/order.model';
import { DEFAULT_TAX } from '../../../core/models/tax.model';
import { ReceiptLine, ReceiptTax } from '../models/checkout.model';

const cents = (value: number) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

/**
 * Desglose del IVA de una venta ya registrada: SIEMPRE el guardado con la venta (HU-36), nunca la
 * configuración vigente de la empresa. Una venta anterior a la configuración (sin esos campos) se
 * trata como se calculó entonces: todo gravado, IVA incluido al 13 %.
 */
export function receiptTax(sale: Sale): ReceiptTax {
  const total = Number(sale.total);
  if (sale.ventasGravadas == null || sale.ventasExentas == null || sale.iva == null) {
    const gravadas = cents(total / (1 + DEFAULT_TAX.tasaIva / 100));
    return {
      aplicaIva: true,
      ivaIncluido: true,
      tasa: DEFAULT_TAX.tasaIva,
      ventasGravadas: gravadas,
      ventasExentas: 0,
      iva: cents(total - gravadas),
    };
  }
  return {
    aplicaIva: sale.aplicaIva ?? true,
    ivaIncluido: sale.ivaIncluido ?? true,
    tasa: Number(sale.tasaIvaAplicada ?? DEFAULT_TAX.tasaIva),
    ventasGravadas: Number(sale.ventasGravadas),
    ventasExentas: Number(sale.ventasExentas),
    iva: Number(sale.iva),
  };
}

/** Líneas del ticket de una venta ya registrada, con el precio sin IVA según la configuración guardada. */
export function receiptLines(sale: Sale, tax: ReceiptTax): ReceiptLine[] {
  return (sale.detalles ?? []).map((line) => {
    const precio = Number(line.precio);
    const exento = line.exento ?? false;
    const dividesTax = tax.aplicaIva && tax.ivaIncluido && !exento;
    const precioSinIva =
      line.precioUnitarioSinIva != null
        ? Number(line.precioUnitarioSinIva)
        : dividesTax
          ? precio / (1 + tax.tasa / 100)
          : precio;
    return {
      cantidad: line.cantidad,
      descripcion: line.producto,
      precio,
      importe: Number(line.subtotal),
      exento,
      precioSinIva,
      importeSinIva: cents(precioSinIva * line.cantidad),
    };
  });
}
