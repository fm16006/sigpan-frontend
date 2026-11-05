import { DOCUMENT } from '@angular/common';
import { Injectable, inject } from '@angular/core';

/** Id del contenedor que solo existe mientras se imprime (ver `@media print` en styles.css). */
export const RECEIPT_PRINT_ROOT = 'receipt-print-root';

/**
 * Imprime el ticket con el diálogo del navegador.
 *
 * El texto se copia a un `<pre>` hijo directo de `<body>`: dentro del diálogo de cobro o del
 * historial quedaría recortado por su alto máximo y su scroll, y solo saldría la parte visible.
 */
@Injectable({ providedIn: 'root' })
export class ReceiptPrint {
  private readonly page = inject(DOCUMENT);

  print(text: string): void {
    const view = this.page.defaultView;
    if (!view || !text) return;

    this.page.getElementById(RECEIPT_PRINT_ROOT)?.remove();
    const root = this.page.createElement('pre');
    root.id = RECEIPT_PRINT_ROOT;
    root.textContent = text;
    this.page.body.appendChild(root);

    const cleanup = () => root.remove();
    view.addEventListener('afterprint', cleanup, { once: true });
    view.print();
  }
}
