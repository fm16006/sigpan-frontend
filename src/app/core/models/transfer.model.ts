import { Id } from './api.model';

export type TransferItemKind = 'MATERIA_PRIMA' | 'PRODUCTO';

export interface TransferLine {
  readonly id: Id;
  readonly tipo: TransferItemKind;
  /** Exactamente uno de los dos viene informado. */
  readonly materiaPrimaId: Id | null;
  readonly productoId: Id | null;
  readonly item: string;
  readonly unidad: string;
  readonly cantidad: number;
  /** Costo promedio del origen con el que entró al destino. */
  readonly costoUnitario: number;
  readonly subtotal: number;
}

export interface Transfer {
  readonly id: Id;
  /** «TRA-000123»: el mismo documento aparece en el kárdex de las dos sucursales. */
  readonly documento: string;
  readonly sucursalOrigenId: Id;
  readonly sucursalOrigen: string;
  readonly sucursalDestinoId: Id;
  readonly sucursalDestino: string;
  /** "YYYY-MM-DD". */
  readonly fecha: string;
  readonly nota: string | null;
  readonly usuarioId: Id | null;
  readonly usuario: string | null;
  /** ISO local, sin zona. */
  readonly creado: string;
  readonly totalLineas: number;
  /** Vacío en el listado; completo en la ficha. */
  readonly lineas: readonly TransferLine[];
}

export interface TransferLineDraft {
  readonly materiaPrimaId?: Id;
  readonly productoId?: Id;
  readonly cantidad: number;
}

/** Cuerpo de POST /traslados. */
export interface TransferDraft {
  readonly sucursalOrigenId: Id;
  readonly sucursalDestinoId: Id;
  readonly fecha: string;
  readonly nota: string;
  readonly lineas: readonly TransferLineDraft[];
}

/** Largo máximo de la nota que acepta el backend. */
export const TRANSFER_NOTE_MAX_LENGTH = 255;
