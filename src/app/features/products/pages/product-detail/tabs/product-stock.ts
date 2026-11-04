import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { API_ENDPOINTS } from '../../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../../core/http/api-client';
import { Id } from '../../../../../core/models/api.model';
import { MOVEMENT_CLASS_LABEL } from '../../../../../core/models/stock-control.model';
import { MoneyPipe } from '../../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { StatCard } from '../../../../../shared/ui/stat-card/stat-card';
import { StatusChip } from '../../../../../shared/ui/status-chip/status-chip';
import { ProductMovement } from '../../../models/product-detail.model';
import { MovementFilter, kardex, summarizeMovements } from '../../../product-view';
import { ProductContext } from '../product-context';

@Component({
  selector: 'app-product-stock',
  imports: [DatePipe, DecimalPipe, MoneyPipe, Icon, StatCard, StatusChip],
  templateUrl: './product-stock.html',
})
export class ProductStock {
  protected readonly ctx = inject(ProductContext);
  private readonly api = inject(ApiClient);

  protected readonly product = this.ctx.product;
  protected readonly filters: readonly { readonly value: MovementFilter; readonly label: string }[] = [
    { value: 'todos', label: 'Todos' },
    { value: 'ENTRADA', label: 'Entradas' },
    { value: 'SALIDA', label: 'Salidas' },
  ];

  protected readonly movementsRes = httpResource<ProductMovement[]>(() =>
    this.api.url(API_ENDPOINTS.movimientos.byProducto(this.ctx.id())),
  );
  private readonly movements = computed(() =>
    this.movementsRes.hasValue() ? this.movementsRes.value() : [],
  );

  protected readonly filter = signal<MovementFilter>('todos');
  private readonly selectedId = signal<Id | null>(null);

  protected readonly rows = computed(() => kardex(this.movements(), this.filter()));
  /** El seleccionado; mientras no se elija ninguno, el más reciente. */
  protected readonly selected = computed(() => {
    const rows = this.rows();
    return rows.find((movement) => movement.id === this.selectedId()) ?? rows[0] ?? null;
  });
  protected readonly summary = computed(() => summarizeMovements(this.movements()));

  protected readonly stock = this.ctx.stock;
  protected readonly cantidad = computed(() => {
    const stock = this.stock();
    return stock ? Number(stock.cantidad) : Number(this.product()?.disponible ?? 0);
  });
  protected readonly minimo = computed(() => {
    const stock = this.stock();
    return Number(stock?.cantidadMinima ?? this.product()?.stockMinimo ?? 0);
  });

  protected select(movement: ProductMovement): void {
    this.selectedId.set(movement.id);
  }

  protected tone(movement: ProductMovement): 'ok' | 'warn' {
    return movement.tipo === 'ENTRADA' ? 'ok' : 'warn';
  }

  /** La clase del movimiento si la tiene (Producción, Merma de proceso...); si no, entrada o salida. */
  protected label(movement: ProductMovement): string {
    return (
      (movement.clase && MOVEMENT_CLASS_LABEL[movement.clase]) || (movement.tipo === 'ENTRADA' ? 'Entrada' : 'Salida')
    );
  }
}
