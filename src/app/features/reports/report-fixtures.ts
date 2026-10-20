import { ReportDefinition, ReportPage } from '../../core/models/report.model';

/** Contrato de ejemplo con la forma que devuelve GET /reportes (RG-01). */
export const RG01: ReportDefinition = {
  codigo: 'RG-01',
  nombre: 'Ventas globales por período',
  slug: 'ventas-globales',
  categoria: 'GENERAL',
  descripcion: 'Conocer el comportamiento total del negocio y comparar el desempeño entre períodos.',
  parametros: [
    {
      clave: 'desde',
      claveHasta: 'hasta',
      etiqueta: 'Período',
      ayuda: null,
      tipo: 'RANGO_FECHAS',
      obligatorio: true,
      valorPorDefecto: '2026-10-01',
      hastaPorDefecto: '2026-10-19',
      opciones: [],
      minimo: null,
      maximo: null,
    },
    {
      clave: 'agrupacion',
      claveHasta: null,
      etiqueta: 'Agrupar por',
      ayuda: null,
      tipo: 'LISTA',
      obligatorio: true,
      valorPorDefecto: 'DIA',
      hastaPorDefecto: null,
      opciones: [
        { valor: 'DIA', etiqueta: 'Día' },
        { valor: 'SEMANA', etiqueta: 'Semana' },
        { valor: 'MES', etiqueta: 'Mes' },
      ],
      minimo: null,
      maximo: null,
    },
    {
      clave: 'sucursalId',
      claveHasta: null,
      etiqueta: 'Sucursal',
      ayuda: null,
      tipo: 'LISTA',
      obligatorio: false,
      textoSinFiltro: 'Todas',
      valorPorDefecto: null,
      hastaPorDefecto: null,
      opciones: [
        { valor: '1', etiqueta: 'Principal' },
        { valor: '2', etiqueta: 'Norte' },
      ],
      minimo: null,
      maximo: null,
    },
  ],
  columnas: [
    { clave: 'periodo', titulo: 'Período', tipo: 'TEXTO', alineacion: 'IZQUIERDA', peso: 4 },
    { clave: 'ventas', titulo: 'Ventas', tipo: 'ENTERO', alineacion: 'DERECHA', peso: 2 },
    { clave: 'total', titulo: 'Total', tipo: 'MONEDA', alineacion: 'DERECHA', peso: 3 },
  ],
  roles: ['ADMINISTRADOR', 'JEFE_PRODUCCION'],
  exponeCostos: false,
};

export const RS03: ReportDefinition = {
  ...RG01,
  codigo: 'RS-03',
  nombre: 'Resumen de rentabilidad por producto',
  categoria: 'SUMARIZADO',
  descripcion: 'Comparar el precio de venta contra el costo.',
};

export const RG01_PAGE: ReportPage = {
  codigo: 'RG-01',
  nombre: 'Ventas globales por período',
  columnas: RG01.columnas,
  filas: [
    { periodo: '02/10/2026', ventas: 3, total: 72.5 },
    { periodo: '03/10/2026', ventas: 2, total: 22 },
  ],
  totales: { periodo: 'Totales', ventas: 5, total: 94.5 },
  metadatos: {
    parametros: [
      { clave: 'desde', etiqueta: 'Período', valor: '01/10/2026 al 19/10/2026' },
      { clave: 'agrupacion', etiqueta: 'Agrupar por', valor: 'Día' },
    ],
    generadoEn: '2026-10-19T14:05:00',
    generadoPor: 'Ana María Gerente',
  },
  paginacion: { pagina: 0, tamano: 25, totalFilas: 2, totalPaginas: 1 },
};
