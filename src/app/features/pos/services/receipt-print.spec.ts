import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { RECEIPT_PRINT_ROOT, ReceiptPrint } from './receipt-print';

describe('ReceiptPrint', () => {
  let page: Document;
  let printSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    page = TestBed.inject(DOCUMENT);
    printSpy = vi.spyOn(page.defaultView as Window, 'print').mockImplementation(() => {});
  });

  afterEach(() => {
    printSpy.mockRestore();
    page.getElementById(RECEIPT_PRINT_ROOT)?.remove();
  });

  it('copia el ticket a un pre hijo directo de body y abre la impresión', () => {
    TestBed.inject(ReceiptPrint).print('TICKET\nTOTAL  $1.50');

    const root = page.getElementById(RECEIPT_PRINT_ROOT);
    expect(root?.parentElement).toBe(page.body);
    expect(root?.tagName).toBe('PRE');
    expect(root?.textContent).toBe('TICKET\nTOTAL  $1.50');
    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it('quita el contenedor al terminar la impresión', () => {
    TestBed.inject(ReceiptPrint).print('TICKET');

    page.defaultView?.dispatchEvent(new Event('afterprint'));

    expect(page.getElementById(RECEIPT_PRINT_ROOT)).toBeNull();
  });

  it('no deja dos tickets si se imprime dos veces seguidas', () => {
    const printer = TestBed.inject(ReceiptPrint);
    printer.print('PRIMERO');
    printer.print('SEGUNDO');

    const roots = page.querySelectorAll(`#${RECEIPT_PRINT_ROOT}`);
    expect(roots).toHaveLength(1);
    expect(roots[0].textContent).toBe('SEGUNDO');
  });

  it('sin texto no abre la impresión', () => {
    TestBed.inject(ReceiptPrint).print('');

    expect(printSpy).not.toHaveBeenCalled();
    expect(page.getElementById(RECEIPT_PRINT_ROOT)).toBeNull();
  });
});
