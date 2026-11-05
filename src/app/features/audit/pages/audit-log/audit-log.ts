import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import { AuditEvent, AuditLog } from '../../../../core/models/audit.model';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { AuditService } from '../../services/audit.service';
import { formatearValor } from '../../audit-format';
import { valueOr } from '../../../../core/http/resource-value';

function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-audit-log',
  imports: [PageHeader, ResourceState, DatePipe, Icon, StatusChip],
  templateUrl: './audit-log.html',
})
export class AuditLogPage {
  private readonly service = inject(AuditService);

  protected readonly crumbs = [{ label: 'Administración' }, { label: 'Bitácora' }];

  private readonly today = new Date();

  protected readonly from = signal(
    isoDate(new Date(this.today.getFullYear(), this.today.getMonth(), 1)),
  );
  protected readonly to = signal(isoDate(this.today));
  protected readonly eventFilter = signal('');
  protected readonly term = signal('');
  protected readonly openId = signal<Id | null>(null);

  // El backend devuelve la bitácora por páginas (lo más reciente primero).
  protected readonly pageSize = 50;
  protected readonly pageIndex = signal(0);

  protected readonly logs = httpResource<AuditLog[]>(
    () =>
      this.service.logsUrl({
        fechaDesde: this.from(),
        fechaHasta: this.to(),
        init: this.pageIndex(),
        page: this.pageSize,
      }),
    { defaultValue: [] },
  );

  /** Si la página vino llena, puede haber más registros en la siguiente. */
  protected readonly logItems = computed(() => valueOr(this.logs, []));
  protected readonly hasNextPage = computed(() => this.logItems().length === this.pageSize);
  protected readonly events = httpResource<AuditEvent[]>(() => this.service.eventsUrl(), {
    defaultValue: [],
  });
  protected readonly eventItems = computed(() => valueOr(this.events, []));

  protected readonly items = computed(() => {
    const event = this.eventFilter();
    const term = this.term().toLowerCase();
    return this.logItems()
      .filter((log) => !event || log.eventoTitulo === event)
      .filter((log) => !term || log.mensaje.toLowerCase().includes(term));
  });

  protected setRange(from: string, to: string): void {
    if (from && to && from <= to) {
      this.from.set(from);
      this.to.set(to);
      this.pageIndex.set(0);
    }
  }

  protected goToPage(index: number): void {
    if (index >= 0) {
      this.pageIndex.set(index);
      this.openId.set(null);
    }
  }

  protected toggle(id: Id): void {
    this.openId.update((current) => (current === id ? null : id));
  }

  protected readonly formatValue = formatearValor;
}
