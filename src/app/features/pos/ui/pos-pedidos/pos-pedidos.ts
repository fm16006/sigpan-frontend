import { Component, computed, inject, output, signal } from '@angular/core';
import { DatePipe, NgTemplateOutlet } from '@angular/common';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { Icon } from '../../../../shared/ui/icon/icon';
import { MAX_ORDERS, PosOrder, itemCount, orderTotal } from '../../pos-orders';
import { orderPreview } from '../../pos-pedidos-logic';
import { registerLabel } from '../../register-utils';
import { CashRegisterStore } from '../../services/cash-register.store';
import { PosOrdersStore } from '../../services/pos-orders.store';
import { PosConsultas } from '../pos-consultas/pos-consultas';
import { PosHistorial } from '../pos-historial/pos-historial';

type PedidosTab = 'borradores' | 'anteriores' | 'consultas';

/**
 * Vista "Pedidos" del punto de venta: los borradores (pedidos abiertos con productos) para
 * retomarlos o descartarlos, y las ventas anteriores del día que se elija.
 */
@Component({
  selector: 'app-pos-pedidos',
  imports: [DatePipe, MoneyPipe, StatusChip, Icon, NgTemplateOutlet, PosHistorial, PosConsultas],
  templateUrl: './pos-pedidos.html',
  host: { class: 'flex min-h-0 flex-1 flex-col bg-base-200' },
})
export class PosPedidos {
  private readonly store = inject(PosOrdersStore);

  readonly back = output<void>();
  /** Retomar un borrador: pasa a ser el pedido activo y se vuelve a vender. */
  readonly resume = output<PosOrder>();
  /** Descartar un borrador (la pantalla confirma antes de quitarlo). */
  readonly discard = output<PosOrder>();
  readonly create = output<void>();

  private readonly register = inject(CashRegisterStore);
  /** Caja del turno abierto; "Caja" si el turno es anterior a las cajas. */
  protected readonly lugar = computed(() => registerLabel(this.register.lugar()?.caja));
  protected readonly maxOrders = MAX_ORDERS;
  protected readonly tab = signal<PedidosTab>('borradores');
  protected readonly drafts = this.store.pendientes;
  protected readonly activeId = this.store.activoId;
  protected readonly openCount = computed(() => this.store.pedidos().length);
  protected readonly canCreate = this.store.puedeCrear;

  protected readonly tabs: readonly { readonly id: PedidosTab }[] = [
    { id: 'borradores' },
    { id: 'anteriores' },
    { id: 'consultas' },
  ];

  protected readonly items = itemCount;
  protected readonly total = orderTotal;
  protected readonly preview = (order: PosOrder) => orderPreview(order);
}
