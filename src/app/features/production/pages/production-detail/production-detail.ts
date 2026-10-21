import { Component, computed, inject, input, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { RouterLink } from '@angular/router';
import { AppError } from '../../../../core/http/app-error';
import {
  Formula,
  FormulaCost,
  MaterialExplosion,
  PRODUCTION_STATUS_LABELS,
  Production,
  ProductionStatus,
  RawMaterial,
} from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { ChipTone, StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { DetailHeader } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { StatCard } from '../../../../shared/ui/stat-card/stat-card';
import { ExplosionTable } from '../../components/explosion-table/explosion-table';
import {
  canTransition,
  orderCode,
  orderUnits,
  ProductionDetailLine,
  progressSteps,
  stepClass,
} from '../../production-summary';
import { ProductionService } from '../../services/production.service';

type OrderAction = 'PRODUCION' | 'TERMINADO' | 'CANCELADO';

interface ActionConfig {
  readonly title: string;
  readonly confirmLabel: string;
  readonly tone: 'primary' | 'danger';
  readonly success: string;
}

const ACTIONS: Readonly<Record<OrderAction, ActionConfig>> = {
  PRODUCION: {
    title: 'Iniciar la orden',
    confirmLabel: 'Iniciar',
    tone: 'primary',
    success: 'Orden iniciada.',
  },
  TERMINADO: {
    title: 'Terminar la orden',
    confirmLabel: 'Terminar',
    tone: 'primary',
    success: 'Orden terminada. El inventario se actualizó.',
  },
  CANCELADO: {
    title: 'Cancelar la orden',
    confirmLabel: 'Cancelar orden',
    tone: 'danger',
    success: 'Orden cancelada.',
  },
};

const STATUS_TONES: Readonly<Record<ProductionStatus, ChipTone>> = {
  PENDIENTE: 'neutral',
  CREADO: 'neutral',
  PRODUCION: 'warn',
  TERMINADO: 'ok',
  CANCELADO: 'bad',
};

interface TimelineStep {
  readonly label: string;
  readonly state: 'done' | 'current' | 'todo';
  readonly bad?: boolean;
}

@Component({
  selector: 'app-production-detail',
  imports: [
    RouterLink,
    DatePipe,
    DecimalPipe,
    DetailHeader,
    ResourceState,
    StatCard,
    StatusChip,
    ConfirmDialog,
    Icon,
    MoneyPipe,
    ExplosionTable,
  ],
  templateUrl: './production-detail.html',
})
export class ProductionDetail {
  private readonly service = inject(ProductionService);
  private readonly notifications = inject(Notifications);
  private readonly auth = inject(Auth);

  /** Parámetro `:id` de la ruta. */
  readonly id = input.required<string>();

  /** Quien administra producción también ve el costo. */
  private readonly canManage = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);

  protected readonly order = httpResource<Production>(() => this.service.orderUrl(Number(this.id())));
  // value() lanza si el recurso está en error: se lee solo cuando hay valor.
  protected readonly current = computed(() => (this.order.hasValue() ? this.order.value() : undefined));

  private readonly formula = httpResource<Formula>(() => {
    const order = this.current();
    return order ? this.service.formulaUrl(order.formulaId) : undefined;
  });
  private readonly cost = httpResource<FormulaCost>(() => {
    const order = this.current();
    return order && this.canManage ? this.service.costUrl(order.formulaId) : undefined;
  });
  private readonly details = httpResource<ProductionDetailLine[]>(
    () => this.service.detailsUrl(Number(this.id())),
    { defaultValue: [] },
  );
  private readonly materials = httpResource<RawMaterial[]>(() => this.service.materialsUrl(), {
    defaultValue: [],
  });

  protected readonly isOpen = computed(() => {
    const order = this.current();
    return !!order && order.estado !== 'TERMINADO' && order.estado !== 'CANCELADO';
  });

  protected readonly units = computed(() => {
    const order = this.current();
    const formula = this.formula.hasValue() ? this.formula.value() : undefined;
    return order && formula ? orderUnits(order, [formula]) : null;
  });

  /** Vista previa de insumos mientras la orden sigue abierta. */
  protected readonly preview = httpResource<MaterialExplosion>(() => {
    const order = this.current();
    const units = this.units();
    return order && this.isOpen() && units ? this.service.explosionUrl(order.productoId, units) : undefined;
  });
  protected readonly previewValue = computed(() =>
    this.preview.hasValue() ? this.preview.value() : null,
  );
  protected readonly previewMessage = computed<string | null>(() => {
    const error = this.preview.error() as AppError | undefined;
    return error ? error.message : null;
  });

  protected readonly discharged = computed(() => {
    const units = new Map(
      (this.materials.hasValue() ? this.materials.value() : []).map((item) => [item.id, item.unidadMedida]),
    );
    return (this.details.hasValue() ? this.details.value() : []).map((line) => ({
      line,
      unit: units.get(line.materiaPrimaId) ?? '',
    }));
  });

  protected readonly costValue = computed(() => (this.cost.hasValue() ? this.cost.value() : null));
  /** Costo estimado con el costo actual de la receta: el backend no guarda el costo real de la orden. */
  protected readonly estimatedCost = computed(() => {
    const order = this.current();
    const cost = this.costValue();
    return order && cost ? Number(cost.costoTotal) * Number(order.cantidad) : null;
  });

  protected readonly code = computed(() => orderCode(Number(this.id())));
  protected readonly statusLabels = PRODUCTION_STATUS_LABELS;
  protected readonly statusTone = STATUS_TONES;
  protected readonly stepClass = stepClass;

  protected readonly crumbs = computed(() => [
    { label: 'Producción' },
    { label: 'Órdenes', link: '/backoffice/production' },
    { label: this.code() },
  ]);

  protected readonly canStart = computed(() => this.can('PRODUCION'));
  protected readonly canFinish = computed(() => this.can('TERMINADO'));
  protected readonly canCancel = computed(() => this.can('CANCELADO'));

  protected readonly timeline = computed<readonly TimelineStep[]>(() => {
    const order = this.current();
    if (!order) return [];
    const steps = progressSteps(order.estado);
    if (steps === null) {
      return [
        { label: 'Creada como pendiente', state: 'done' },
        { label: 'Cancelada', state: 'current', bad: true },
      ];
    }
    return steps.map((step, index) => ({
      label: index === 0 ? 'Creada como pendiente' : PRODUCTION_STATUS_LABELS[step.status],
      state: step.state,
    }));
  });

  protected readonly pendingAction = signal<OrderAction | null>(null);
  protected readonly busy = signal(false);

  protected readonly dialog = computed(() => {
    const action = this.pendingAction();
    const order = this.current();
    if (!action || !order) return null;
    const config = ACTIONS[action];
    const subject = `la orden ${this.code()} de ${order.producto}`;
    const units = this.units();
    const message =
      action === 'PRODUCION'
        ? `Vas a iniciar ${subject}. Pasa a En producción y todavía no se mueve el inventario.`
        : action === 'TERMINADO'
          ? `Vas a terminar ${subject}. Se descargan los insumos de la receta${units ? ` y entran ${units} unidades al inventario` : ' y entra el producto al inventario'}. No se puede deshacer.`
          : `Vas a cancelar ${subject}. No se mueve el inventario y la orden no se puede reabrir.`;
    return { ...config, message };
  });

  private can(target: OrderAction): boolean {
    const order = this.current();
    return !!order && canTransition(order.estado, target);
  }

  protected reloadAll(): void {
    this.order.reload();
    this.details.reload();
  }

  protected confirmAction(): void {
    const action = this.pendingAction();
    const order = this.current();
    if (!action || !order) return;

    this.busy.set(true);
    this.service.changeStatus(order.id, action).subscribe({
      next: () => {
        this.busy.set(false);
        this.pendingAction.set(null);
        this.notifications.success(ACTIONS[action].success);
        this.order.reload();
        this.details.reload();
        this.preview.reload();
      },
      error: (error: AppError) => {
        this.busy.set(false);
        this.pendingAction.set(null);
        // Los errores de validación (por ejemplo, insumos insuficientes) no los avisa el interceptor.
        if (error.kind === 'validation') {
          this.notifications.error(error.message);
        }
      },
    });
  }
}
