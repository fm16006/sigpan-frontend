/**
 * Contrato del motor de reportes (HU-45). El catálogo y el formulario salen del backend: el
 * frontend no conoce ningún reporte en particular.
 */

export type ReportCategory = 'GENERAL' | 'ESPECIFICO' | 'DETALLADO' | 'SUMARIZADO';

export type ReportParamType = 'FECHA' | 'RANGO_FECHAS' | 'ENTERO' | 'LISTA' | 'BOOLEANO';

export type ReportColumnType = 'TEXTO' | 'ENTERO' | 'DECIMAL' | 'MONEDA' | 'FECHA' | 'PORCENTAJE';

export interface ReportOption {
  readonly valor: string;
  readonly etiqueta: string;
}

export interface ReportParam {
  /** Clave del parámetro; en un rango de fechas, la de la fecha inicial. */
  readonly clave: string;
  /** Solo en RANGO_FECHAS: clave de la fecha final. */
  readonly claveHasta: string | null;
  readonly etiqueta: string;
  readonly ayuda: string | null;
  readonly tipo: ReportParamType;
  readonly obligatorio: boolean;
  readonly valorPorDefecto: string | null;
  readonly hastaPorDefecto: string | null;
  readonly opciones: readonly ReportOption[];
  /** Texto de la lista opcional sin elegir ("Todos", "Todas"). */
  readonly textoSinFiltro?: string;
  readonly minimo: number | null;
  readonly maximo: number | null;
}

export interface ReportColumn {
  readonly clave: string;
  readonly titulo: string;
  readonly tipo: ReportColumnType;
  readonly alineacion: 'IZQUIERDA' | 'CENTRO' | 'DERECHA';
  readonly peso: number;
}

export interface ReportDefinition {
  readonly codigo: string;
  readonly nombre: string;
  readonly slug: string;
  readonly categoria: ReportCategory;
  /** La decisión de negocio que habilita el reporte. */
  readonly descripcion: string;
  readonly parametros: readonly ReportParam[];
  readonly columnas: readonly ReportColumn[];
  readonly roles: readonly string[];
  readonly exponeCostos: boolean;
}

export type ReportCell = string | number | null;
export type ReportRow = Readonly<Record<string, ReportCell>>;

export interface ReportAppliedParam {
  readonly clave: string;
  readonly etiqueta: string;
  readonly valor: string;
}

export interface ReportPage {
  readonly codigo: string;
  readonly nombre: string;
  readonly columnas: readonly ReportColumn[];
  readonly filas: readonly ReportRow[];
  /** Totales de TODO el resultado, no de la página. Los calcula el servidor. */
  readonly totales: ReportRow | null;
  readonly metadatos: {
    readonly parametros: readonly ReportAppliedParam[];
    readonly generadoEn: string;
    readonly generadoPor: string;
  };
  readonly paginacion: {
    readonly pagina: number;
    readonly tamano: number;
    readonly totalFilas: number;
    readonly totalPaginas: number;
  };
}

export const REPORT_CATEGORY_ORDER: readonly ReportCategory[] = [
  'GENERAL',
  'ESPECIFICO',
  'DETALLADO',
  'SUMARIZADO',
];

export const REPORT_CATEGORY_LABEL: Readonly<Record<ReportCategory, string>> = {
  GENERAL: 'Generales',
  ESPECIFICO: 'Específicos',
  DETALLADO: 'Detallados',
  SUMARIZADO: 'Sumarizados',
};
