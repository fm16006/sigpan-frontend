import { Register, RegisterBranch } from '../../core/models/branch.model';

/** Nombre de la caja para la barra del punto de venta: "Caja 01"; "Caja" si el turno no la guardó. */
export function registerLabel(register: string | null | undefined): string {
  return register?.trim() || 'Caja';
}

/** Cajas que pueden cobrar: las activas de la panadería. */
export function activeRegisters(branch: Pick<RegisterBranch, 'cajas'> | null | undefined): readonly Register[] {
  return (branch?.cajas ?? []).filter((register) => register.activo);
}
