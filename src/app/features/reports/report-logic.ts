import { QueryParams } from '../../core/http/api-client';
import {
  REPORT_CATEGORY_LABEL,
  REPORT_CATEGORY_ORDER,
  ReportCategory,
  ReportCell,
  ReportColumn,
  ReportDefinition,
  ReportParam,
} from '../../core/models/report.model';

/** Valores del formulario: texto para todo, salvo el booleano. */
export type ReportFormValues = Record<string, string | boolean>;

export interface ReportGroup {
  readonly category: ReportCategory;
  readonly label: string;
  readonly reports: readonly ReportDefinition[];
}

/** Agrupa el catálogo por categoría, en el orden de la visión; las categorías vacías no aparecen. */
export function groupByCategory(reports: readonly ReportDefinition[]): readonly ReportGroup[] {
  return REPORT_CATEGORY_ORDER.map((category) => ({
    category,
    label: REPORT_CATEGORY_LABEL[category],
    reports: reports
      .filter((report) => report.categoria === category)
      .sort((a, b) => a.codigo.localeCompare(b.codigo)),
  })).filter((group) => group.reports.length > 0);
}

/** Todas las claves de formulario del contrato (el rango aporta dos). */
export function paramKeys(param: ReportParam): readonly string[] {
  return param.tipo === 'RANGO_FECHAS' && param.claveHasta
    ? [param.clave, param.claveHasta]
    : [param.clave];
}

/** Valores iniciales del formulario: los valores por defecto que trae el contrato. */
export function initialValues(definition: ReportDefinition): ReportFormValues {
  const values: ReportFormValues = {};
  for (const param of definition.parametros) {
    if (param.tipo === 'BOOLEANO') {
      values[param.clave] = param.valorPorDefecto === 'true';
    } else {
      values[param.clave] = param.valorPorDefecto ?? '';
      if (param.tipo === 'RANGO_FECHAS' && param.claveHasta) {
        values[param.claveHasta] = param.hastaPorDefecto ?? '';
      }
    }
  }
  return values;
}

/** Query string de la petición: solo lo que tiene valor. Los booleanos viajan como true/false. */
export function toQuery(definition: ReportDefinition, values: ReportFormValues): QueryParams {
  const query: Record<string, string> = {};
  for (const param of definition.parametros) {
    for (const key of paramKeys(param)) {
      const value = values[key];
      if (typeof value === 'boolean') {
        query[key] = String(value);
      } else if (value !== undefined && value.trim() !== '') {
        query[key] = value.trim();
      }
    }
  }
  return query;
}

/**
 * Validación previa a la petición, para avisar sin ir al servidor. Es la misma regla de rango que
 * aplica el backend (que sigue siendo la que manda): obligatorios y desde <= hasta.
 */
export function validateValues(
  definition: ReportDefinition,
  values: ReportFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const param of definition.parametros) {
    if (param.tipo === 'RANGO_FECHAS' && param.claveHasta) {
      const from = String(values[param.clave] ?? '').trim();
      const to = String(values[param.claveHasta] ?? '').trim();
      if (param.obligatorio && !from) errors[param.clave] = 'Indicá la fecha inicial.';
      if (param.obligatorio && !to) errors[param.claveHasta] = 'Indicá la fecha final.';
      if (from && to && from > to) {
        errors[param.claveHasta] = 'La fecha final no puede ser anterior a la inicial.';
      }
    } else if (param.obligatorio && param.tipo !== 'BOOLEANO') {
      if (String(values[param.clave] ?? '').trim() === '') {
        errors[param.clave] = `${param.etiqueta} es obligatorio.`;
      }
    }
  }
  return errors;
}

export interface RangePreset {
  readonly label: string;
  readonly from: string;
  readonly to: string;
}

function iso(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Atajos de rango de fechas, relativos a hoy (fecha local). */
export function rangePresets(today: Date = new Date()): readonly RangePreset[] {
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const startOfPreviousMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const endOfPreviousMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 6);

  return [
    { label: 'Este mes', from: iso(startOfMonth), to: iso(today) },
    { label: 'Mes anterior', from: iso(startOfPreviousMonth), to: iso(endOfPreviousMonth) },
    { label: 'Últimos 7 días', from: iso(sevenDaysAgo), to: iso(today) },
  ];
}

const NUMBER = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INTEGER = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });

/**
 * Texto de una celda según el tipo de su columna. Solo da formato: el frontend nunca recalcula una
 * cifra (DD-08), muestra la que devolvió el servidor, con el mismo formato que el PDF ($1,234.50).
 */
export function formatCell(column: ReportColumn, value: ReportCell | undefined): string {
  if (value === null || value === undefined || value === '') return '';

  switch (column.tipo) {
    case 'TEXTO':
      return String(value);
    case 'ENTERO':
      return INTEGER.format(Number(value));
    case 'DECIMAL':
      return NUMBER.format(Number(value));
    case 'MONEDA': {
      const amount = Number(value);
      return `${amount < 0 ? '-' : ''}$${NUMBER.format(Math.abs(amount))}`;
    }
    case 'PORCENTAJE':
      return `${NUMBER.format(Number(value))} %`;
    case 'FECHA': {
      const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
      return match ? `${match[3]}/${match[2]}/${match[1]}` : String(value);
    }
  }
}

/** Clase de alineación de Tailwind según la columna. */
export function alignClass(column: ReportColumn): string {
  switch (column.alineacion) {
    case 'DERECHA':
      return 'text-end';
    case 'CENTRO':
      return 'text-center';
    default:
      return 'text-start';
  }
}

/** Nombre de archivo del encabezado Content-Disposition, o el de respaldo si no se puede leer. */
export function filenameFromDisposition(header: string | null, fallback: string): string {
  if (!header) return fallback;
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header);
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1].trim());
    } catch {
      // sigue con la forma simple
    }
  }
  const simple = /filename="?([^";]+)"?/i.exec(header);
  return simple ? simple[1].trim() : fallback;
}
