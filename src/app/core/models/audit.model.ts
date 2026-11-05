import { Id } from './api.model';

export interface AuditEvent {
  readonly id: Id;
  readonly titulo: string;
  readonly descripcion: string | null;
  readonly estado: boolean;
}

export interface AuditLog {
  readonly id: Id;
  readonly eventoId: Id | null;
  readonly eventoTitulo: string | null;
  readonly usuarioId: Id | null;
  readonly mensaje: string;
  readonly fecha: string;
  /** Estado previo del dato (JSON), o null si la operacion no modifica un valor existente. */
  readonly valorAnterior: string | null;
  /** Estado nuevo del dato (JSON), o null si no aplica. */
  readonly valorPosterior: string | null;
}

export interface AuditLogQuery {
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  /** Número de página, desde 0 (el backend lo llama `init`). */
  readonly init: number;
  /** Registros por página (el backend lo llama `page`). */
  readonly page: number;
}
