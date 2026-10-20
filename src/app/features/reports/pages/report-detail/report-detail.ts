import { DatePipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, DestroyRef, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { QueryParams } from '../../../../core/http/api-client';
import { AppError } from '../../../../core/http/app-error';
import { asAppError } from '../../../../core/http/as-app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { valueOr } from '../../../../core/http/resource-value';
import { ReportDefinition, ReportPage, ReportParam } from '../../../../core/models/report.model';
import { Notifications } from '../../../../core/services/notifications';
import { saveFile } from '../../../../core/utils/download';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { EmptyState } from '../../../../shared/ui/empty-state/empty-state';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { ReportForm, createReportForm } from '../../report-form';
import {
  RangePreset,
  alignClass,
  formatCell,
  rangePresets,
  toQuery,
  validateValues,
} from '../../report-logic';
import { ReportExportFormat, ReportService } from '../../services/report.service';

const PAGE_SIZE = 25;

/**
 * Ficha de un reporte: el formulario de parámetros se arma con el contrato que manda el backend,
 * y el mismo resultado se ve en pantalla o se exporta a PDF y a hoja de cálculo.
 */
@Component({
  selector: 'app-report-detail',
  imports: [
    ReactiveFormsModule,
    RouterLink,
    DatePipe,
    PageHeader,
    ResourceState,
    EmptyState,
    StatusChip,
  ],
  templateUrl: './report-detail.html',
})
export class ReportDetail {
  private readonly service = inject(ReportService);
  private readonly notifications = inject(Notifications);
  private readonly destroyRef = inject(DestroyRef);

  /** Código del reporte (parámetro de la ruta). */
  readonly codigo = input.required<string>();

  protected readonly catalog = httpResource<ReportDefinition[]>(() => this.service.catalogUrl(), {
    defaultValue: [],
  });

  protected readonly definition = computed(
    () => valueOr(this.catalog, []).find((r) => r.codigo === this.codigo().toUpperCase()) ?? null,
    { equal: (a, b) => a?.codigo === b?.codigo },
  );

  protected readonly form = computed<ReportForm | null>(() => {
    const definition = this.definition();
    return definition ? createReportForm(definition) : null;
  });

  protected readonly crumbs = computed<readonly Crumb[]>(() => {
    const definition = this.definition();
    return [
      { label: 'Reportes', link: '/backoffice/reports' },
      { label: definition ? `${definition.codigo} ${definition.nombre}` : this.codigo() },
    ];
  });

  protected readonly presets: readonly RangePreset[] = rangePresets();

  protected readonly result = signal<ReportPage | null>(null);
  protected readonly loading = signal(false);
  protected readonly error = signal<AppError | null>(null);
  protected readonly formError = signal<string | null>(null);
  protected readonly exporting = signal<ReportExportFormat | null>(null);

  /** Parámetros con los que se generó lo que está en pantalla; es lo que se exporta. */
  private readonly applied = signal<QueryParams | null>(null);

  protected readonly pageIndex = computed(() => this.result()?.paginacion.pagina ?? 0);
  protected readonly canExport = computed(() => this.result() !== null && this.exporting() === null);

  protected generate(): void {
    const definition = this.definition();
    const form = this.form();
    if (!definition || !form) return;

    this.formError.set(null);
    form.markAllAsTouched();

    const localErrors = validateValues(definition, form.getRawValue());
    if (Object.keys(localErrors).length > 0) {
      for (const [key, message] of Object.entries(localErrors)) {
        form.get(key)?.setErrors({ server: message });
      }
      return;
    }

    this.applied.set(toQuery(definition, form.getRawValue()));
    this.result.set(null);
    this.load(0);
  }

  protected goToPage(index: number): void {
    const result = this.result();
    if (result && index >= 0 && index < result.paginacion.totalPaginas) {
      this.load(index);
    }
  }

  protected retry(): void {
    this.load(this.pageIndex());
  }

  protected applyPreset(param: ReportParam, preset: RangePreset): void {
    const form = this.form();
    if (!form || !param.claveHasta) return;
    form.patchValue({ [param.clave]: preset.from, [param.claveHasta]: preset.to });
    form.markAsDirty();
  }

  protected exportAs(format: ReportExportFormat): void {
    const definition = this.definition();
    const query = this.applied();
    if (!definition || !query || this.exporting()) return;

    this.exporting.set(format);
    this.service
      .download(definition.codigo, format, query)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (file) => {
          saveFile(file.blob, file.filename);
          this.exporting.set(null);
        },
        error: (error: unknown) => {
          this.exporting.set(null);
          const appError = asAppError(error);
          // El interceptor ya avisó los errores que no son de validación.
          if (appError.kind === 'validation') {
            this.notifications.error('No pudimos generar el archivo con esos parámetros.');
          }
        },
      });
  }

  protected errorFor(key: string): string | null {
    const form = this.form();
    return form ? firstErrorMessage(form, key) : null;
  }

  protected readonly format = formatCell;
  protected readonly align = alignClass;

  private load(page: number): void {
    const definition = this.definition();
    const query = this.applied();
    const form = this.form();
    if (!definition || !query || !form) return;

    this.loading.set(true);
    this.error.set(null);
    this.service
      .run(definition.codigo, query, page, PAGE_SIZE)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.result.set(result);
          this.loading.set(false);
        },
        error: (error: unknown) => {
          const appError = asAppError(error);
          this.loading.set(false);
          if (appError.kind === 'validation') {
            // Errores por campo junto a cada control; el resto, arriba del formulario.
            applyFieldErrors(form, appError);
            form.markAllAsTouched();
            this.formError.set(formLevelMessage(appError));
          } else {
            this.error.set(appError);
          }
        },
      });
  }
}
