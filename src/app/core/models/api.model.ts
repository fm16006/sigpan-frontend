/** Identificador de entidad. */
export type Id = number;

/** Respuesta paginada del backend. */
export interface Page<T> {
  readonly content: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly totalElements: number;
  readonly totalPages: number;
}

/** Parámetros de consulta aceptados por los listados. */
export interface PageQuery {
  readonly page?: number;
  readonly size?: number;
  readonly sort?: string;
  readonly search?: string;
}

/** Cuerpo de error del backend. */
export interface ApiErrorBody {
  readonly message?: string;
  readonly code?: string;
  /** Errores por campo, para pintarlos junto al input correspondiente. */
  readonly errors?: Readonly<Record<string, string>>;
  /** Productos sin existencia suficiente (EXISTENCIA_INSUFICIENTE). */
  readonly faltantes?: readonly unknown[];
}

export const EMPTY_PAGE: Page<never> = {
  content: [],
  page: 0,
  size: 0,
  totalElements: 0,
  totalPages: 0,
};
