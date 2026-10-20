import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { valueOr } from '../../../../core/http/resource-value';
import { ReportDefinition } from '../../../../core/models/report.model';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { groupByCategory } from '../../report-logic';
import { ReportService } from '../../services/report.service';

/**
 * Catálogo de reportes. Sale del backend ya filtrado por el rol: un reporte que todavía no existe
 * (o que el rol no puede generar) simplemente no aparece.
 */
@Component({
  selector: 'app-report-catalog',
  imports: [RouterLink, PageHeader, ResourceState, Icon],
  template: `
    <app-page-header
      title="Reportes"
      subtitle="Elegí un reporte, ajustá sus parámetros y generalo en pantalla, en PDF o en hoja de cálculo."
      [crumbs]="crumbs"
    />

    <app-resource-state
      [loading]="reports.isLoading() && !reports.hasValue()"
      [failed]="!!reports.error()"
      [empty]="items().length === 0"
      emptyTitle="Sin reportes disponibles"
      emptyDescription="Tu rol todavía no tiene reportes asignados."
      (retry)="reports.reload()"
    >
      <div class="grid gap-6">
        @for (group of groups(); track group.category) {
          <section [attr.aria-label]="'Reportes ' + group.label.toLowerCase()">
            <h2 class="list-th mb-2">{{ group.label }}</h2>
            <div class="overflow-hidden rounded-box border border-base-300 bg-base-100">
              @for (report of group.reports; track report.codigo; let first = $first) {
                <a
                  class="list-row grid-cols-[5rem_minmax(0,1fr)_1rem] max-sm:grid-cols-[4.5rem_minmax(0,1fr)_1rem]"
                  [class.border-t-0]="first"
                  [routerLink]="['/backoffice/reports', report.codigo]"
                >
                  <span class="font-mono text-xs font-semibold text-base-content/70">{{ report.codigo }}</span>
                  <span class="min-w-0">
                    <span class="block font-medium">{{ report.nombre }}</span>
                    <span class="block text-sm text-base-content/65">{{ report.descripcion }}</span>
                  </span>
                  <app-icon name="chevron" class="text-base-content/40" />
                </a>
              }
            </div>
          </section>
        }
      </div>
    </app-resource-state>
  `,
})
export class ReportCatalog {
  private readonly service = inject(ReportService);

  protected readonly crumbs = [{ label: 'Reportes' }];

  protected readonly reports = httpResource<ReportDefinition[]>(() => this.service.catalogUrl(), {
    defaultValue: [],
  });

  protected readonly items = computed(() => valueOr(this.reports, []));
  protected readonly groups = computed(() => groupByCategory(this.items()));
}
