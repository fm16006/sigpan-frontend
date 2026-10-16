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
  readonly valor: string | null;
}

export interface AuditLogQuery {
  readonly fechaDesde: string;
  readonly fechaHasta: string;
}
