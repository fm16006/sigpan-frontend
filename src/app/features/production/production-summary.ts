import { Formula, Production, ProductionStatus } from '../../core/models/production.model';

/** Insumo que una orden terminada descargó (GET /produccion-detalle/produccion/:id). */
export interface ProductionDetailLine {
  readonly id: number;
  readonly produccionId: number;
  readonly materiaPrimaId: number;
  readonly materiaPrima: string;
  readonly cantidad: number;
}

export type OrderSegment = 'activas' | 'terminadas' | 'canceladas' | 'todas';

export const ORDER_SEGMENTS: readonly { value: OrderSegment; label: string }[] = [
  { value: 'activas', label: 'Activas' },
  { value: 'terminadas', label: 'Terminadas' },
  { value: 'canceladas', label: 'Canceladas' },
  { value: 'todas', label: 'Todas' },
];

/** Transiciones que permite el backend (ProduccionService.TRANSICIONES). */
export const ALLOWED_TRANSITIONS: Readonly<Record<ProductionStatus, readonly ProductionStatus[]>> = {
  PENDIENTE: ['CREADO', 'PRODUCION', 'TERMINADO', 'CANCELADO'],
  CREADO: ['PRODUCION', 'TERMINADO', 'CANCELADO'],
  PRODUCION: ['TERMINADO', 'CANCELADO'],
  TERMINADO: [],
  CANCELADO: [],
};

export function canTransition(from: ProductionStatus, to: ProductionStatus): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

/** Código visible de la orden: ORD-0142. */
export function orderCode(id: number): string {
  return `ORD-${String(id).padStart(4, '0')}`;
}

/**
 * Unidades planificadas de la orden. El backend las calcula con la versión de la receta con que se confirmó
 * (DEF-23); si no las informa, lotes × lo que rinde hoy un lote de la receta.
 */
export function orderUnits(
  production: Pick<Production, 'cantidad' | 'formulaId' | 'cantidadPlanificada'>,
  formulas: readonly Pick<Formula, 'id' | 'cantidadProduccion'>[],
): number | null {
  if (production.cantidadPlanificada != null) return Number(production.cantidadPlanificada);
  const formula = formulas.find((item) => item.id === production.formulaId);
  return formula ? Number(formula.cantidadProduccion) * Number(production.cantidad) : null;
}

/** HU-21: unidades que entraron al inventario. Solo en una orden terminada: las obtenidas, no las planificadas. */
export function producedUnits(
  production: Pick<Production, 'estado' | 'cantidadObtenida'>,
  planned: number | null,
): number | null {
  if (production.estado !== 'TERMINADO') return null;
  return production.cantidadObtenida != null ? Number(production.cantidadObtenida) : planned;
}

/** Segmento al que pertenece un estado: todo lo que no está cerrado es activo. */
export function segmentOf(status: ProductionStatus): Exclude<OrderSegment, 'todas'> {
  if (status === 'TERMINADO') return 'terminadas';
  if (status === 'CANCELADO') return 'canceladas';
  return 'activas';
}

export function matchesSegment(status: ProductionStatus, segment: OrderSegment): boolean {
  return segment === 'todas' || segmentOf(status) === segment;
}

/** Coincide por código (ORD-0142 o 142), producto o receta. */
export function matchesOrderSearch(production: Production, term: string): boolean {
  const query = term.trim().toLowerCase();
  if (!query) {
    return true;
  }
  return (
    orderCode(production.id).toLowerCase().includes(query) ||
    String(production.id) === query ||
    production.producto.toLowerCase().includes(query) ||
    production.formula.toLowerCase().includes(query)
  );
}

export type StepState = 'done' | 'current' | 'todo';

export interface ProgressStep {
  readonly status: ProductionStatus;
  readonly state: StepState;
}

const FLOW: readonly ProductionStatus[] = ['PENDIENTE', 'PRODUCION', 'TERMINADO'];

/**
 * Avance de la orden: Pendiente → En producción → Terminada. Una orden creada cuenta como
 * pendiente. Devuelve null si está cancelada, que se muestra como chip aparte.
 */
export function progressSteps(status: ProductionStatus): readonly ProgressStep[] | null {
  if (status === 'CANCELADO') {
    return null;
  }
  const position = status === 'TERMINADO' ? 2 : status === 'PRODUCION' ? 1 : 0;
  return FLOW.map((step, index) => ({
    status: step,
    state: index < position || position === 2 ? 'done' : index === position ? 'current' : 'todo',
  }));
}

const STEP_CLASSES: Readonly<Record<StepState, string>> = {
  done: 'rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold',
  current: 'rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-primary-content',
  todo: 'rounded-full border border-base-300 px-2.5 py-0.5 text-xs text-base-content/60',
};

/** Clases del paso del avance según su estado. */
export function stepClass(state: StepState): string {
  return STEP_CLASSES[state];
}
