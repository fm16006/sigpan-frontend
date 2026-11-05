import { Id } from './api.model';

/** GET /materias-primas/:id/kardex */
export interface KardexRow {
  readonly id: Id;
  readonly fecha: string;
  readonly tipo: 'ENTRADA' | 'SALIDA';
  readonly clase: string | null;
  readonly documento: string | null;
  readonly motivo: string | null;
  readonly entrada: number | null;
  readonly salida: number | null;
  readonly saldo: number;
  readonly costoUnitario: number | null;
  readonly valor: number | null;
  readonly lotes: string | null;
  readonly usuario: string | null;
}

export interface Kardex {
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidad: string;
  readonly desde: string | null;
  readonly hasta: string | null;
  readonly saldoInicial: number;
  readonly valorInicial: number;
  readonly filas: readonly KardexRow[];
  readonly saldoFinal: number;
  readonly valorFinal: number;
}

export interface ReorderAlert {
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidad: string;
  readonly existencia: number;
  readonly stockMinimo: number;
  readonly puntoReorden: number;
  readonly sugerido: number;
  readonly critico: boolean;
}

export interface Lot {
  readonly id: Id;
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidad: string;
  readonly numero: string | null;
  readonly fechaVencimiento: string | null;
  readonly diasRestantes: number | null;
  readonly cantidadInicial: number;
  readonly cantidad: number;
}

export interface MaterialAvailability {
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidad: string;
  readonly existencia: number;
  readonly proximoVencimiento: string | null;
  readonly lotes: readonly Lot[];
}

export interface AltUnit {
  readonly id: Id;
  readonly materiaPrimaId: Id;
  readonly nombre: string;
  readonly factor: number;
  readonly unidadBase: string;
}

export interface CountLine {
  readonly id: Id;
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidad: string;
  readonly saldoSistema: number;
  readonly contado: number | null;
  readonly diferencia: number | null;
  readonly costoUnitario: number | null;
  readonly valorDiferencia: number | null;
}

export interface PhysicalCount {
  readonly id: Id;
  readonly fecha: string;
  readonly fechaCierre: string | null;
  readonly estado: 'ABIERTA' | 'CERRADA' | 'ANULADA';
  readonly usuario: string | null;
  readonly observacion: string | null;
  readonly contados: number;
  readonly valorDiferencia: number | null;
  readonly lineas: readonly CountLine[];
}

/** Etiqueta legible de la clase de movimiento. */
export const MOVEMENT_CLASS_LABEL: Readonly<Record<string, string>> = {
  COMPRA: 'Compra',
  PRODUCCION: 'Producción',
  MERMA: 'Merma',
  MERMA_PROCESO: 'Merma de proceso',
  AJUSTE: 'Ajuste',
  TOMA_FISICA: 'Toma física',
  VENTA: 'Venta',
};

/** HU-53: GET /tablero */
export interface ManagementBoard {
  readonly fecha: string;
  readonly ventasPorCanal: readonly { readonly canal: 'MOSTRADOR' | 'EN_LINEA'; readonly ventas: number; readonly total: number }[];
  readonly totalDia: number;
  readonly masVendidos: readonly { readonly productoId: Id; readonly producto: string; readonly cantidad: number }[];
  readonly alertasReorden: readonly ReorderAlert[];
  readonly pedidosPorEstado: Readonly<Record<string, number>>;
  readonly lotesPorVencer: number;
}

/** HU-44: GET /ventas/sugerencia-produccion */
export interface ProductionSuggestion {
  readonly productoId: Id;
  readonly producto: string;
  readonly pedidos: number;
  readonly unidades: number;
  readonly porProducir: number;
  readonly existencia: number;
  readonly sugerido: number;
  readonly formulaId: Id | null;
  readonly rendimiento: number | null;
  readonly lotesSugeridos: number | null;
}
