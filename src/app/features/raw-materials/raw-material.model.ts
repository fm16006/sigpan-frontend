import { Id } from '../../core/models/api.model';

/** Cuerpo de POST y PUT /materias-primas. */
export interface RawMaterialDraft {
  readonly nombre: string;
  readonly descripcion: string;
  readonly unidadMedida: string;
  readonly precio: number;
  readonly stockMinimo: number;
}

/** Línea de receta que usa un insumo (`/formula-detalles/materia-prima/:id`). */
export interface FormulaUsage {
  readonly id: Id;
  readonly formulaId: Id;
  readonly formula: string;
  readonly materiaPrimaId: Id;
  readonly materiaPrima: string;
  readonly unidadMedida: string;
  readonly cantidad: number;
}
