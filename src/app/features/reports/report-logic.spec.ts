import { ReportColumn } from '../../core/models/report.model';
import { RG01, RS03 } from './report-fixtures';
import {
  alignClass,
  filenameFromDisposition,
  formatCell,
  groupByCategory,
  initialValues,
  rangePresets,
  toQuery,
  validateValues,
} from './report-logic';

const col = (tipo: ReportColumn['tipo'], alineacion: ReportColumn['alineacion'] = 'DERECHA'): ReportColumn => ({
  clave: 'x',
  titulo: 'X',
  tipo,
  alineacion,
  peso: 1,
});

describe('Catálogo de reportes', () => {
  it('agrupa por categoría en el orden de la visión y omite las vacías', () => {
    const groups = groupByCategory([RS03, RG01]);

    expect(groups.map((g) => g.label)).toEqual(['Generales', 'Sumarizados']);
    expect(groups[0].reports.map((r) => r.codigo)).toEqual(['RG-01']);
  });

  it('sin reportes no hay grupos (lo que no existe en el backend no se muestra)', () => {
    expect(groupByCategory([])).toEqual([]);
  });
});

describe('Formulario desde el contrato', () => {
  it('parte de los valores por defecto del contrato', () => {
    expect(initialValues(RG01)).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-19',
      agrupacion: 'DIA',
      sucursalId: '',
    });
  });

  it('la petición lleva solo lo que tiene valor', () => {
    expect(toQuery(RG01, initialValues(RG01))).toEqual({
      desde: '2026-10-01',
      hasta: '2026-10-19',
      agrupacion: 'DIA',
    });
    expect(toQuery(RG01, { ...initialValues(RG01), sucursalId: '2' })['sucursalId']).toBe('2');
  });

  it('valida obligatorios y que desde no pase de hasta', () => {
    expect(validateValues(RG01, initialValues(RG01))).toEqual({});
    expect(validateValues(RG01, { ...initialValues(RG01), desde: '' })).toEqual({
      desde: 'Indicá la fecha inicial.',
    });
    expect(validateValues(RG01, { ...initialValues(RG01), desde: '2026-10-20' })).toEqual({
      hasta: 'La fecha final no puede ser anterior a la inicial.',
    });
    expect(validateValues(RG01, { ...initialValues(RG01), agrupacion: '' })).toEqual({
      agrupacion: 'Agrupar por es obligatorio.',
    });
  });
});

describe('Atajos del rango de fechas', () => {
  const today = new Date(2026, 9, 19); // 19 de octubre de 2026

  it('este mes, mes anterior y últimos 7 días', () => {
    const [thisMonth, lastMonth, last7] = rangePresets(today);

    expect(thisMonth).toEqual({ label: 'Este mes', from: '2026-10-01', to: '2026-10-19' });
    expect(lastMonth).toEqual({ label: 'Mes anterior', from: '2026-09-01', to: '2026-09-30' });
    expect(last7).toEqual({ label: 'Últimos 7 días', from: '2026-10-13', to: '2026-10-19' });
  });

  it('en enero el mes anterior es diciembre del año anterior', () => {
    const lastMonth = rangePresets(new Date(2027, 0, 10))[1];
    expect(lastMonth).toMatchObject({ from: '2026-12-01', to: '2026-12-31' });
  });
});

describe('Formato por tipo de columna (solo formato, nunca recálculo)', () => {
  it('moneda, entero, decimal, porcentaje, fecha y texto', () => {
    expect(formatCell(col('MONEDA'), 1234.5)).toBe('$1,234.50');
    expect(formatCell(col('MONEDA'), -2)).toBe('-$2.00');
    expect(formatCell(col('ENTERO'), 12345)).toBe('12,345');
    expect(formatCell(col('DECIMAL'), 0.5)).toBe('0.50');
    expect(formatCell(col('PORCENTAJE'), 12.5)).toBe('12.50 %');
    expect(formatCell(col('FECHA'), '2026-10-01')).toBe('01/10/2026');
    expect(formatCell(col('TEXTO', 'IZQUIERDA'), 'Pan francés')).toBe('Pan francés');
    expect(formatCell(col('MONEDA'), null)).toBe('');
  });

  it('alinea según la columna', () => {
    expect(alignClass(col('MONEDA'))).toBe('text-end');
    expect(alignClass(col('FECHA', 'CENTRO'))).toBe('text-center');
    expect(alignClass(col('TEXTO', 'IZQUIERDA'))).toBe('text-start');
  });
});

describe('Nombre del archivo descargado', () => {
  it('lo toma del encabezado Content-Disposition', () => {
    expect(
      filenameFromDisposition(
        'attachment; filename="RG-01_ventas-globales_2026-10-01_2026-10-19.pdf"',
        'x.pdf',
      ),
    ).toBe('RG-01_ventas-globales_2026-10-01_2026-10-19.pdf');
    expect(
      filenameFromDisposition("attachment; filename*=UTF-8''RG-01%20a.xlsx", 'x.xlsx'),
    ).toBe('RG-01 a.xlsx');
  });

  it('sin encabezado usa el nombre de respaldo', () => {
    expect(filenameFromDisposition(null, 'RG-01.pdf')).toBe('RG-01.pdf');
  });
});

describe('formatCell con cantidades y costos', () => {
  const col = (tipo: ReportColumn['tipo']): ReportColumn =>
    ({ clave: 'x', titulo: 'X', tipo, alineacion: 'DERECHA', peso: 2 }) as ReportColumn;

  it('las cantidades salen con 3 decimales (0.075 kg no se redondea a 0.08)', () => {
    expect(formatCell(col('CANTIDAD'), 0.075)).toBe('0.075');
    expect(formatCell(col('CANTIDAD'), 1250.5)).toBe('1,250.500');
  });

  it('los costos unitarios salen con 4 decimales y signo de dólar', () => {
    expect(formatCell(col('COSTO'), 0.0012)).toBe('$0.0012');
    expect(formatCell(col('COSTO'), -1.5)).toBe('-$1.5000');
  });
});
