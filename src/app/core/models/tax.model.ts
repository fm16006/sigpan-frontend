
/** Configuración del IVA de la empresa (HU-36). Cada venta guarda la suya al registrarse. */
export interface TaxConfig {
  readonly aplicaIva: boolean;
  /** true: el precio de los productos ya trae el IVA; false: el IVA se suma al precio. */
  readonly ivaIncluido: boolean;
  /** Porcentaje: 13 = 13 %. */
  readonly tasaIva: number;
}

/** Lo que rige mientras la empresa no cargó (o si falla): el IVA de siempre, 13 % incluido. */
export const DEFAULT_TAX: TaxConfig = { aplicaIva: true, ivaIncluido: true, tasaIva: 13 };

/** Desglose que el servidor calcula y guarda con la cotización, la venta y el pedido. */
export interface TaxBreakdown {
  readonly aplicaIva: boolean;
  readonly ivaIncluido: boolean;
  readonly ventasGravadas: number;
  readonly ventasExentas: number;
  readonly iva: number;
}

export const TAX_RATE_MIN = 0;
export const TAX_RATE_MAX = 100;

/** "13 %", "16.5 %". */
export function taxRateLabel(rate: number): string {
  return `${Number(Number(rate).toFixed(2))} %`;
}

/** Precio de un producto de $1.00 una vez sumado el IVA, p. ej. 13 % → "$1.13". */
export function taxExample(rate: number): string {
  return `$${(1 + Number(rate) / 100).toFixed(2)}`;
}

/** true si el catálogo debe avisar "+ IVA": el IVA aplica, no va incluido y el producto no es exento. */
export function showsPlusTax(config: TaxConfig, exento: boolean | undefined): boolean {
  return config.aplicaIva && !config.ivaIncluido && !exento;
}

export function sameTax(a: TaxConfig, b: TaxConfig): boolean {
  return (
    a.aplicaIva === b.aplicaIva &&
    a.ivaIncluido === b.ivaIncluido &&
    Math.round(Number(a.tasaIva) * 100) === Math.round(Number(b.tasaIva) * 100)
  );
}

/**
 * Explica en lenguaje simple lo que implica cambiar la configuración del IVA, para la ventana de
 * confirmación. Devuelve null si no cambió nada (entonces se guarda sin preguntar).
 */
export function describeTaxChange(before: TaxConfig, after: TaxConfig): string[] | null {
  if (sameTax(before, after)) {
    return null;
  }

  const notes = [
    'El cambio aplica desde la próxima venta. Las ventas y pedidos ya registrados no cambian.',
  ];
  const modeChanged = before.ivaIncluido !== after.ivaIncluido;
  const rateChanged = Math.round(before.tasaIva * 100) !== Math.round(after.tasaIva * 100);

  if (before.aplicaIva && !after.aplicaIva) {
    notes.push('Se deja de aplicar IVA: los tickets ya no muestran IVA y los productos se cobran sin impuesto.');
  } else {
    if (!before.aplicaIva) {
      notes.push('Se vuelve a aplicar IVA a los productos que no estén marcados como exentos.');
    }
    if (rateChanged) {
      notes.push(`La tasa de IVA cambia de ${taxRateLabel(before.tasaIva)} a ${taxRateLabel(after.tasaIva)}.`);
    }
    if (!after.ivaIncluido && (modeChanged || rateChanged || !before.aplicaIva)) {
      notes.push(
        `El IVA ya no va incluido: el cliente pagará el precio más el IVA. Por ejemplo, un producto de $1.00 se cobrará ${taxExample(after.tasaIva)}.`,
      );
    } else if (after.ivaIncluido && (modeChanged || !before.aplicaIva)) {
      notes.push('El IVA va incluido: el precio publicado ya contiene el IVA y el total que paga el cliente no sube.');
    }
  }

  notes.push('Los pedidos en borrador del punto de venta y los carritos de la tienda se recalculan al cobrar.');
  return notes;
}

/** Aviso al marcar o desmarcar «Exento de IVA» en un producto que ya existe. */
export function describeExemptChange(exento: boolean): string[] {
  return [
    exento
      ? 'Este producto se venderá sin IVA, aunque la empresa aplique IVA al resto.'
      : 'Este producto volverá a llevar IVA según la configuración de la empresa.',
    'Aplica desde la próxima venta; las ventas y pedidos ya registrados no cambian.',
  ];
}

