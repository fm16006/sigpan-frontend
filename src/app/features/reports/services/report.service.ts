import { HttpClient, HttpResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient, QueryParams } from '../../../core/http/api-client';
import { ReportPage } from '../../../core/models/report.model';
import { filenameFromDisposition } from '../report-logic';

export type ReportExportFormat = 'pdf' | 'xlsx';

export interface ReportFile {
  readonly blob: Blob;
  readonly filename: string;
}

@Injectable({ providedIn: 'root' })
export class ReportService {
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);

  /** Catálogo filtrado por el rol, con el contrato de cada reporte. */
  catalogUrl(): string {
    return this.api.url(API_ENDPOINTS.reportes.root);
  }

  /** Una página del reporte en pantalla. Los totales vienen de todo el resultado. */
  run(codigo: string, query: QueryParams, page: number, size: number): Observable<ReportPage> {
    return this.api.get<ReportPage>(API_ENDPOINTS.reportes.byCodigo(codigo), {
      ...query,
      page,
      size,
    });
  }

  /** Descarga el reporte con los mismos parámetros que la pantalla (lleva el token como todo el API). */
  download(codigo: string, format: ReportExportFormat, query: QueryParams): Observable<ReportFile> {
    const path =
      format === 'pdf' ? API_ENDPOINTS.reportes.pdf(codigo) : API_ENDPOINTS.reportes.xlsx(codigo);

    return this.http
      .get(this.api.url(path, query), { observe: 'response', responseType: 'blob' })
      .pipe(
        map((response: HttpResponse<Blob>) => ({
          blob: response.body as Blob,
          filename: filenameFromDisposition(
            response.headers.get('Content-Disposition'),
            `${codigo}.${format}`,
          ),
        })),
      );
  }
}
