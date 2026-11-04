import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { firstValueFrom } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient, QueryParams } from '../../../../core/http/api-client';
import { valueOr } from '../../../../core/http/resource-value';
import { EMPTY_PAGE, Page } from '../../../../core/models/api.model';
import { CashierOption, RegisterStatus, Sale, SaleSummary } from '../../../../core/models/order.model';
import { CompanyStore } from '../../../../core/services/company-store';
import { Notifications } from '../../../../core/services/notifications';
import { downloadCsv } from '../../../../core/utils/csv';
import { debouncedSignal } from '../../../../core/utils/debounced-signal';
import { todayIso } from '../../../../core/utils/dates';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { saleToReceipt } from '../../../pos/pos-pedidos-logic';
import { formatReceipt } from '../../../pos/receipt/receipt-format';
import { ReceiptPrint } from '../../../pos/services/receipt-print';
import { OrderTimeline } from '../../../storefront/ui/order-timeline/order-timeline';
import { isoDaysAgo } from '../../register-status';
import {
  CHANNEL_LABELS,
  CSV_HEADER,
  SaleChannel,
  csvRow,
  parseSearch,
  paymentLabel,
  statusLabel,
  statusOptions,
  whoOf,
} from '../../sales-history-logic';

const PAGE_SIZE = 25;
/** El CSV junta páginas de 100 hasta este tope, para no colgar el navegador. */
const CSV_MAX_PAGES = 20;

/**
 * HU-69, pestaña Ventas y pedidos del punto de venta: ventas de mostrador, pedidos en línea y
 * encargos en un solo listado paginado, con filtros, detalle (líneas, IVA, pago, línea de tiempo,
 * anulación), reimpresión del ticket y CSV. Lo que cada rol ve lo filtra el servidor.
 */
@Component({
  selector: 'app-sales-history',
  imports: [DatePipe, MoneyPipe, ResourceState, StatusChip, FormDrawer, OrderTimeline],
  templateUrl: './sales-history.html',
})
export class SalesHistory {
  private readonly api = inject(ApiClient);
  private readonly company = inject(CompanyStore);
  private readonly receiptPrint = inject(ReceiptPrint);
  private readonly notifications = inject(Notifications);

  protected readonly today = todayIso();
  protected readonly channels = Object.entries(CHANNEL_LABELS) as [SaleChannel, string][];
  protected readonly from = signal(isoDaysAgo(7));
  protected readonly to = signal(todayIso());
  protected readonly channel = signal<SaleChannel | null>(null);
  protected readonly status = signal<string | null>(null);
  protected readonly cajeroId = signal<number | null>(null);
  protected readonly cajaId = signal<number | null>(null);
  protected readonly search = signal('');
  private readonly searchDebounced = debouncedSignal(this.search, 350);
  protected readonly page = signal(0);
  protected readonly exporting = signal(false);

  protected readonly rangeInvalid = computed(() => !!this.from() && !!this.to() && this.from() > this.to());
  protected readonly statuses = computed(() => statusOptions(this.channel()));

  private readonly filters = computed<QueryParams>(() => ({
    desde: this.from() || undefined,
    hasta: this.to() || undefined,
    tipo: this.channel(),
    estado: this.status(),
    cajeroId: this.cajeroId(),
    cajaId: this.cajaId(),
    ...parseSearch(this.searchDebounced()),
  }));

  protected readonly source = httpResource<Page<SaleSummary>>(
    () =>
      this.rangeInvalid()
        ? undefined
        : this.api.url(API_ENDPOINTS.orders.history, { ...this.filters(), pagina: this.page(), tamano: PAGE_SIZE }),
    { defaultValue: EMPTY_PAGE },
  );
  protected readonly result = computed(() => valueOr(this.source, EMPTY_PAGE));

  private readonly registersRes = httpResource<RegisterStatus[]>(() => this.api.url(API_ENDPOINTS.turnos.cajas), {
    defaultValue: [],
  });
  protected readonly registers = computed(() => valueOr(this.registersRes, []));
  private readonly cashiersRes = httpResource<CashierOption[]>(
    () => this.api.url(API_ENDPOINTS.turnos.cajeros, { soloLibres: false }),
    { defaultValue: [] },
  );
  protected readonly cashiers = computed(() => valueOr(this.cashiersRes, []));

  /** Venta abierta en el panel lateral: el detalle completo sale de la consulta. */
  protected readonly selectedId = signal<number | null>(null);
  protected readonly detailRes = httpResource<Sale>(() => {
    const id = this.selectedId();
    return id ? this.api.url(API_ENDPOINTS.orders.consulta(id)) : undefined;
  });
  protected readonly detail = computed(() => valueOr<Sale | undefined>(this.detailRes, undefined));

  protected readonly channelLabel = (tipo: SaleChannel) => CHANNEL_LABELS[tipo] ?? tipo;
  protected readonly statusLabel = statusLabel;
  protected readonly paymentLabel = paymentLabel;
  protected readonly whoOf = whoOf;

  protected statusTone(status: string): 'ok' | 'bad' | 'info' | 'neutral' {
    if (status === 'COMPLETADA' || status === 'ENTREGADO') return 'ok';
    if (status === 'ANULADA' || status === 'CANCELADO') return 'bad';
    if (status === 'PENDIENTE') return 'neutral';
    return 'info';
  }

  // Cualquier filtro nuevo vuelve a la primera página.
  protected setFrom(value: string): void {
    this.from.set(value);
    this.page.set(0);
  }

  protected setTo(value: string): void {
    this.to.set(value);
    this.page.set(0);
  }

  protected setChannel(value: string): void {
    this.channel.set((value || null) as SaleChannel | null);
    // Un estado que no existe en el canal nuevo vaciaría la lista sin explicación.
    if (this.status() && !statusOptions(this.channel()).includes(this.status()!)) this.status.set(null);
    this.page.set(0);
  }

  protected setStatus(value: string): void {
    this.status.set(value || null);
    this.page.set(0);
  }

  protected setCajero(value: string): void {
    this.cajeroId.set(value ? Number(value) : null);
    this.page.set(0);
  }

  protected setCaja(value: string): void {
    this.cajaId.set(value ? Number(value) : null);
    this.page.set(0);
  }

  protected setSearch(value: string): void {
    this.search.set(value);
    this.page.set(0);
  }

  protected goTo(page: number): void {
    const last = Math.max(0, this.result().totalPages - 1);
    this.page.set(Math.min(Math.max(0, page), last));
  }

  /** Ticket de la venta de mostrador abierta, igual al que imprime la caja. */
  protected print(sale: Sale): void {
    this.receiptPrint.print(formatReceipt(saleToReceipt(sale), this.company.info()).join('\n'));
  }

  /** CSV de todo lo filtrado, no solo de la página que se ve. */
  protected async exportCsv(): Promise<void> {
    this.exporting.set(true);
    try {
      const rows: (string | number)[][] = [];
      for (let page = 0; page < CSV_MAX_PAGES; page++) {
        const chunk = await firstValueFrom(
          this.api.get<Page<SaleSummary>>(API_ENDPOINTS.orders.history, { ...this.filters(), pagina: page, tamano: 100 }),
        );
        rows.push(...chunk.content.map(csvRow));
        if (page + 1 >= chunk.totalPages) break;
      }
      downloadCsv(`ventas-${this.from()}-a-${this.to()}.csv`, CSV_HEADER, rows);
    } catch {
      this.notifications.error('No pudimos generar el CSV. Intentá de nuevo.');
    } finally {
      this.exporting.set(false);
    }
  }
}
