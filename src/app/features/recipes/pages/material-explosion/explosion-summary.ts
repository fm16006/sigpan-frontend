import { MaterialExplosionLine } from '../../../../core/models/production.model';

/** Cantidad que falta del insumo para cubrir lo requerido; 0 si alcanza. */
export function cantidadFaltante(insumo: MaterialExplosionLine): number {
  if (insumo.suficiente) {
    return 0;
  }
  return Number((insumo.cantidadRequerida - insumo.existencia).toFixed(3));
}

/** Insumos que no alcanzan para la producción consultada. */
export function insumosFaltantes(insumos: readonly MaterialExplosionLine[]): MaterialExplosionLine[] {
  return insumos.filter((insumo) => !insumo.suficiente);
}
