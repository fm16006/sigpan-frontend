import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe } from '@angular/common';
import { Id } from '../../../../core/models/api.model';
import { AuditEvent, AuditLog } from '../../../../core/models/audit.model';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { AuditService } from '../../services/audit.service';

function isoDate(date: Date): string {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

@Component({
  selector: 'app-audit-log',
  imports: [PageHeader, ResourceState, DatePipe],
  templateUrl: './audit-log.html',
})
export class AuditLogPage {
  private readonly service = inject(AuditService);

  private readonly today = new Date();

  protected readonly from = signal(
    isoDate(new Date(this.today.getFullYear(), this.today.getMonth(), 1)),
  );
  protected readonly to = signal(isoDate(this.today));
  protected readonly eventFilter = signal('');
  protected readonly term = signal('');
  protected readonly openId = signal<Id | null>(null);

  protected readonly logs = httpResource<AuditLog[]>(
    () => this.service.logsUrl({ fechaDesde: this.from(), fechaHasta: this.to() }),
    { defaultValue: [] },
  );
  protected readonly events = httpResource<AuditEvent[]>(() => this.service.eventsUrl(), {
    defaultValue: [],
  });

  protected readonly items = computed(() => {
    const event = this.eventFilter();
    const term = this.term().toLowerCase();
    return this.logs
      .value()
      .filter((log) => !event || log.eventoTitulo === event)
      .filter((log) => !term || log.mensaje.toLowerCase().includes(term));
  });

  protected setRange(from: string, to: string): void {
    if (from && to && from <= to) {
      this.from.set(from);
      this.to.set(to);
    }
  }

  protected toggle(id: Id): void {
    this.openId.update((current) => (current === id ? null : id));
  }

  protected detail(log: AuditLog): string {
    if (!log.valor) {
      return 'Sin detalle.';
    }
    try {
      return JSON.stringify(JSON.parse(log.valor), null, 2);
    } catch {
      return log.valor;
    }
  }
}
