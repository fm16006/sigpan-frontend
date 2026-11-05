import { BUSINESS_INFO } from '../../core/config/business.config';
import { Sale } from '../../core/models/order.model';
import { PosLine } from './models/checkout.model';
import {
  filterSales,
  isCancelled,
  isQueryableDay,
  orderPreview,
  parseDay,
  saleDocument,
  saleItemCount,
  saleToReceipt,
  shiftDay,
  sortSales,
  summarizeSales,
  yesterdayIso,
} from './pos-pedidos-logic';
import { PosOrder } from './pos-orders';
import { formatReceipt } from './receipt/receipt-format';

function sale(id: number, total: number, extra: Partial<Sale> = {}): Sale {
  return {
    id,
    usuarioId: 8,
    usuario: 'Ana Pérez',
    tipo: 'MOSTRADOR',
    estado: 'COMPLETADA',
    fecha: `2026-10-19T${String(8 + id).padStart(2, '0')}:15:00`,
    subtotal: total,
    descuento: 0,
    total,
    detalles: [
      { id: id * 10, productoId: 1, producto: 'Pan francés', cantidad: 4, precio: 0.25, descuento: 0, subtotal: 1 },
      { id: id * 10 + 1, productoId: 2, producto: 'Café con leche', cantidad: 1, precio: 1.5, descuento: 0, subtotal: 1.5 },
    ],
    ...extra,
  };
}

function line(nombre: string, quantity = 1): PosLine {
  return { quantity, product: { id: 1, nombre, precio: 1 } as PosLine['product'] };
}

describe('pedidos: lógica de borradores', () => {
  const order = (lines: PosLine[]): PosOrder => ({
    id: 1,
    nombre: 'Pedido 1',
    lines,
    creadoEn: '2026-10-19T10:00:00.000Z',
  });

  it('muestra los primeros tres productos y cuántos más hay', () => {
    const preview = orderPreview(
      order([line('A'), line('B'), line('C'), line('D'), line('E')]),
    );
    expect(preview.names).toEqual(['A', 'B', 'C']);
    expect(preview.more).toBe(2);
  });

  it('un pedido corto no tiene "más"', () => {
    expect(orderPreview(order([line('A')]))).toEqual({ names: ['A'], more: 0 });
    expect(orderPreview(order([]))).toEqual({ names: [], more: 0 });
  });
});

describe('pedidos: fechas', () => {
  it('ayer cruza el cambio de mes y de año', () => {
    expect(shiftDay('2026-03-01', 1)).toBe('2026-02-28');
    expect(shiftDay('2026-01-01', 1)).toBe('2025-12-31');
    expect(yesterdayIso(new Date(2026, 9, 19, 9, 0))).toBe('2026-10-18');
  });

  it('solo se consulta un día válido y no futuro', () => {
    expect(isQueryableDay('2026-10-19', '2026-10-19')).toBe(true);
    expect(isQueryableDay('2026-10-18', '2026-10-19')).toBe(true);
    expect(isQueryableDay('2026-10-20', '2026-10-19')).toBe(false);
    expect(isQueryableDay('', '2026-10-19')).toBe(false);
    expect(isQueryableDay('2026-02-30', '2026-10-19')).toBe(false);
  });

  it('parseDay devuelve el mismo día local', () => {
    const date = parseDay('2026-10-19');
    expect([date.getFullYear(), date.getMonth(), date.getDate()]).toEqual([2026, 9, 19]);
  });
});

describe('pedidos: ventas anteriores', () => {
  const sales = [
    sale(1, 2.5),
    sale(2, 7, { detalles: [{ id: 99, productoId: 3, producto: 'Pastel de tres leches', cantidad: 2, precio: 3.5, descuento: 0, subtotal: 7 }] }),
    sale(3, 4, { estado: 'CANCELADO', usuario: 'Luis' }),
  ];

  it('ordena de la más reciente a la más antigua', () => {
    expect(sortSales(sales).map((s) => s.id)).toEqual([3, 2, 1]);
  });

  it('cuenta los artículos de una venta', () => {
    expect(saleItemCount(sales[0])).toBe(5);
    expect(saleItemCount(sale(9, 1, { detalles: null }))).toBe(0);
  });

  it('busca por número de venta, con o sin "#"', () => {
    expect(filterSales(sales, '2').map((s) => s.id)).toEqual([2]);
    expect(filterSales(sales, '#3').map((s) => s.id)).toEqual([3]);
  });

  it('busca por producto sin importar tildes ni mayúsculas', () => {
    expect(filterSales(sales, 'PAN FRANCES').map((s) => s.id)).toEqual([1, 3]);
    expect(filterSales(sales, 'tres leches').map((s) => s.id)).toEqual([2]);
    expect(filterSales(sales, 'zzz')).toEqual([]);
  });

  it('sin texto devuelve todas', () => {
    expect(filterSales(sales, '  ')).toBe(sales);
  });

  it('resume el día sin contar las anuladas', () => {
    expect(summarizeSales(sales)).toEqual({ ventas: 2, anuladas: 1, articulos: 7, total: 9.5 });
    expect(summarizeSales([])).toEqual({ ventas: 0, anuladas: 0, articulos: 0, total: 0 });
  });

  it('suma en centavos sin arrastrar error de coma flotante', () => {
    const cents = [sale(1, 0.1), sale(2, 0.2), sale(3, 0.3)];
    expect(summarizeSales(cents).total).toBe(0.6);
  });

  it('reconoce una venta anulada', () => {
    expect(isCancelled(sales[2])).toBe(true);
    expect(isCancelled(sales[0])).toBe(false);
  });

  it('arma el ticket desde la venta, sin recibido ni cambio', () => {
    const receipt = saleToReceipt(sales[0]);
    expect(receipt.numero).toBe(1);
    expect(receipt.cajero).toBe('Ana Pérez');
    expect(receipt.total).toBe(2.5);
    expect(receipt.lineas).toMatchObject([
      { cantidad: 4, descripcion: 'Pan francés', precio: 0.25, importe: 1 },
      { cantidad: 1, descripcion: 'Café con leche', precio: 1.5, importe: 1.5 },
    ]);
    // Venta sin desglose guardado (anterior a HU-36): se trata como se calculó entonces, 13 % incluido.
    expect(receipt.impuestos).toEqual({
      aplicaIva: true,
      ivaIncluido: true,
      tasa: 13,
      ventasGravadas: 2.21,
      ventasExentas: 0,
      iva: 0.29,
    });
    expect(receipt.sinDetallePago).toBe(true);
    expect(receipt.anulada).toBe(false);

    const text = formatReceipt(receipt, BUSINESS_INFO);
    expect(text.some((row) => row.includes('No. 000001'))).toBe(true);
    expect(text.some((row) => row.startsWith('CAMBIO'))).toBe(false);
  });

  it('el ticket de una venta anulada lo marca, y sin cajero queda "—"', () => {
    const receipt = saleToReceipt(sale(4, 1, { estado: 'CANCELADO', usuario: null }));
    expect(receipt.anulada).toBe(true);
    expect(receipt.cajero).toBe('—');
    expect(
      formatReceipt(receipt, BUSINESS_INFO).some((row) => row.includes('VENTA ANULADA')),
    ).toBe(true);
  });

  it('una venta sin detalle da un ticket sin líneas', () => {
    expect(saleToReceipt(sale(5, 1, { detalles: null })).lineas).toEqual([]);
  });

  it('HU-36: la reimpresión trae el tipo de documento, No. control, Cód. generación, cliente y total en letras', () => {
    const ccf = sale(6, 2.5, {
      tipoDte: '03',
      numeroControl: 'DTE-03-M001P001-000000000000004',
      codigoGeneracion: '0F1E2D3C-4B5A-4978-8695-A4B3C2D1E0F9',
      receptorNombre: 'Distribuidora, S.A. de C.V.',
      totalLetras: 'DOS 50/100 DÓLARES',
    });
    const receipt = saleToReceipt(ccf);
    expect(receipt).toMatchObject({
      documento: 'CCF',
      numeroControl: 'DTE-03-M001P001-000000000000004',
      codigoGeneracion: '0F1E2D3C-4B5A-4978-8695-A4B3C2D1E0F9',
      receptor: 'Distribuidora, S.A. de C.V.',
      totalLetras: 'DOS 50/100 DÓLARES',
    });

    const text = formatReceipt(receipt, BUSINESS_INFO);
    expect(text.some((row) => row.startsWith('COMPROBANTE DE CREDITO FISCAL No. 000006'))).toBe(true);
    // Las líneas largas siguen abajo: se revisa el texto corrido.
    const joined = text.join(' ');
    expect(joined).toContain('No. control: DTE-03-M001P001-000000000000004');
    expect(joined).toContain('Cod. gen.: 0F1E2D3C-4B5A-4978-8695-A4B3C2D1E0F9');
    expect(joined).toContain('Cliente: Distribuidora, S.A. de C.V.');
    expect(joined).toContain('SON: DOS 50/100 DÓLARES');
  });

  it('HU-36: el documento sale del tipo DTE guardado, como al cobrar', () => {
    expect(saleDocument(sale(1, 1, { tipoDte: '03', receptorNombre: 'Empresa' }))).toBe('CCF');
    expect(saleDocument(sale(1, 1, { tipoDte: '01', receptorNombre: 'Juan Pérez' }))).toBe('FACTURA');
    expect(saleDocument(sale(1, 1, { tipoDte: '01', receptorNombre: '  ' }))).toBe('TICKET');
    expect(saleDocument(sale(1, 1))).toBe('TICKET');
  });
});
