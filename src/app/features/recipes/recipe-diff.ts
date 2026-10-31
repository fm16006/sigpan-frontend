import { FormulaVersion } from '../../core/models/production.model';

export type DiffKind = 'igual' | 'agregado' | 'quitado' | 'cambiado';

export interface DiffRow {
  readonly materiaPrima: string;
  readonly unidad: string;
  readonly antes: number | null;
  readonly despues: number | null;
  readonly cambio: DiffKind;
}

/** HU-17: compara insumo por insumo dos versiones de una receta. */
export function diffVersions(a: FormulaVersion, b: FormulaVersion): DiffRow[] {
  const antes = new Map(a.contenido.detalles.map((d) => [Number(d.materiaPrimaId), d]));
  const despues = new Map(b.contenido.detalles.map((d) => [Number(d.materiaPrimaId), d]));
  const ids = [...new Set([...antes.keys(), ...despues.keys()])];
  return ids
    .map((id) => {
      const x = antes.get(id);
      const y = despues.get(id);
      const cambio: DiffKind = !x ? 'agregado' : !y ? 'quitado' : Number(x.cantidad) === Number(y.cantidad) ? 'igual' : 'cambiado';
      return {
        materiaPrima: (y ?? x)!.materiaPrima,
        unidad: (y ?? x)!.unidadMedida,
        antes: x ? Number(x.cantidad) : null,
        despues: y ? Number(y.cantidad) : null,
        cambio,
      };
    })
    .sort((p, q) => p.materiaPrima.localeCompare(q.materiaPrima, 'es'));
}
