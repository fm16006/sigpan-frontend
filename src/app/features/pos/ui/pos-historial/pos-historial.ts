import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { CompanyStore } from '../../../../core/services/company-store';
import { valueOr } from '../../../../core/http/resource-value';
import { CashCut, Sale } from '../../../../core/models/order.model';
import { Auth } from '../../../../core/services/auth';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { OrderService } from '../../../storefront/services/order.service';
import {
  filterSales,
  isCancelled,
  isQueryableDay,
  parseDay,
  saleItemCount,
  saleToReceipt,
  sortSales,
  summarizeSales,
  yesterdayIso,
} from '../../pos-pedidos-logic';
import { formatReceipt } from '../../receipt/receipt-format';
import { ReceiptPrint } from '../../services/receipt-print';

const LONG_DAY = new Intl.DateTimeFormat('es-SV', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

function upperFirst(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Ventas anteriores del mostrador, tomadas del corte del día (`GET /ventas/corte`): un cajero
 * ve solo las suyas y la administración, todas. Se puede revisar el detalle de cada una y
 * reimprimir su ticket con la impresión del navegador. Anular ventas depende de HU-37.
 */
@Component({
  selector: 'app-pos-historial',
  imports: [DatePipe, MoneyPipe, StatusChip, ResourceState, Icon],
  templateUrl: './pos-historial.html',
  host: {
    class: 'flex min-h-0 flex-1 flex-col',
    '(document:keydown.escape)': 'closeDetail()',
  },
})
export class PosHistorial {
  private readonly orders = inject(OrderService);
  private readonly receiptPrint = inject(ReceiptPrint);
  private readonly company = inject(CompanyStore);

  protected readonly isAdmin = inject(Auth).hasAnyRole(['ADMINISTRADOR']);

  protected readonly today = todayIso();
  protected readonly yesterday = yesterdayIso();
  protected readonly date = signal(this.today);
  protected readonly query = signal('');
  protected readonly selectedId = signal<number | null>(null);

  protected readonly cut = httpResource<CashCut>(() =>
    isQueryableDay(this.date()) ? this.orders.cashCutUrl(this.date()) : undefined,
  );
  private readonly cutValue = computed(() => valueOr(this.cut, undefined));

  protected readonly sales = computed(() => sortSales(this.cutValue()?.ventas ?? []));
  protected readonly visible = computed(() => filterSales(this.sales(), this.query()));
  protected readonly summary = computed(() => summarizeSales(this.sales()));
  protected readonly selected = computed<Sale | null>(
    () => this.sales().find((sale) => sale.id === this.selectedId()) ?? null,
  );
  protected readonly validDate = computed(() => isQueryableDay(this.date()));
  protected readonly dayLabel = computed(() =>
    this.validDate() ? upperFirst(LONG_DAY.format(parseDay(this.date()))) : '',
  );
  protected readonly isToday = computed(() => this.date() === this.today);
  protected readonly isYesterday = computed(() => this.date() === this.yesterday);

  /** El ticket de la venta abierta; es lo que se ve en pantalla y lo que sale al imprimir. */
  protected readonly receiptText = computed(() => {
    const sale = this.selected();
    return sale ? formatReceipt(saleToReceipt(sale), this.company.info()).join('\n') : '';
  });

  protected readonly isCancelled = isCancelled;
  protected readonly itemCount = saleItemCount;

  protected setDate(value: string): void {
    if (value && value !== this.date()) {
      this.date.set(value);
      this.selectedId.set(null);
    }
  }

  protected open(sale: Sale): void {
    this.selectedId.set(sale.id);
  }

  protected closeDetail(): void {
    this.selectedId.set(null);
  }

  /** Abre la impresión del navegador solo con el ticket (ver ReceiptPrint). */
  protected print(): void {
    this.receiptPrint.print(this.receiptText());
  }
}
