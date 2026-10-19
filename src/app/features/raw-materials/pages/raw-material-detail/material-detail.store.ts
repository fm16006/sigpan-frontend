import { httpResource } from '@angular/common/http';
import { Injectable, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { Id } from '../../../../core/models/api.model';
import { RawMaterialStock, StockMovement } from '../../../../core/models/inventory.model';
import { Formula, RawMaterial } from '../../../../core/models/production.model';
import { ItemPurchase } from '../../../../core/models/purchase.model';
import { Auth } from '../../../../core/services/auth';
import {
  buildMaterialRow,
  consumption,
  daysOfSupply,
  latestCost,
  withRunningBalance,
} from '../../raw-material-calc';
import { FormulaUsage } from '../../raw-material.model';
import { valueOr } from '../../../../core/http/resource-value';
import { PurchaseService } from '../../../purchases/services/purchase.service';
import { InventoryService } from '../../services/inventory.service';

/** Ventana, en días, del consumo que muestra el resumen. */
export const CONSUMPTION_DAYS = 7;

export interface RecipeUsageRow {
  readonly id: Id;
  readonly productoId: Id | null;
  readonly producto: string;
  readonly receta: string;
  readonly cantidad: number;
  readonly unidad: string;
  readonly costoLote: number | null;
}

/**
 * Datos de la ficha de un insumo, compartidos por el encabezado y las pestañas.
 * Se provee en el componente de la ficha; las pestañas hijas lo inyectan.
 */
@Injectable()
export class MaterialDetailStore {
  private readonly service = inject(InventoryService);
  private readonly purchaseService = inject(PurchaseService);
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(Auth);

  readonly id = toSignal(this.route.paramMap.pipe(map((params) => Number(params.get('id')))), {
    initialValue: Number(this.route.snapshot.paramMap.get('id')),
  });

  /** Administración y bodega escriben; jefe de producción solo consulta. */
  readonly canWrite = this.auth.hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);
  /** Las recetas las expone el backend solo a administración y jefe de producción. */
  readonly canSeeRecipes = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);

  readonly material = httpResource<RawMaterial>(() => this.service.materialUrl(this.id()));
  private readonly stocks = httpResource<RawMaterialStock[]>(
    () => this.service.stockUrl('materia-prima'),
    { defaultValue: [] },
  );
  readonly movements = httpResource<StockMovement[]>(
    () => this.service.movementsUrl('materia-prima', this.id()),
    { defaultValue: [] },
  );
  /** Últimas compras a proveedores de este insumo (con proveedor y documento). */
  readonly purchases = httpResource<ItemPurchase[]>(
    () => this.purchaseService.latestUrl('materia-prima', this.id(), 5),
    { defaultValue: [] },
  );
  readonly purchaseList = computed(() => valueOr(this.purchases, []));
  readonly usage = httpResource<FormulaUsage[]>(
    () => (this.canSeeRecipes ? this.service.formulaLinesUrl(this.id()) : undefined),
    { defaultValue: [] },
  );
  private readonly formulas = httpResource<Formula[]>(
    () =>
      this.canSeeRecipes && valueOr(this.usage, []).length > 0
        ? this.service.formulasUrl()
        : undefined,
    { defaultValue: [] },
  );

  /** El insumo, o `undefined` mientras carga o si la consulta falló. */
  readonly current = computed(() => valueOr<RawMaterial | undefined>(this.material, undefined));

  readonly loading = computed(() => this.material.isLoading() || this.stocks.isLoading());
  readonly failed = computed(() => !!this.material.error() || !!this.stocks.error());

  readonly movementList = computed(() => valueOr(this.movements, []));

  readonly row = computed(() => {
    if (!this.material.hasValue() || !this.material.value()) return null;
    const stock = valueOr(this.stocks, []).find((item) => item.materiaPrimaId === this.id());
    return buildMaterialRow(this.material.value(), stock, latestCost(this.movementList()));
  });

  readonly kardex = computed(() => {
    const row = this.row();
    return withRunningBalance(
      this.movementList(),
      row && row.inventarioId !== null ? row.cantidad : null,
    );
  });

  readonly consumed = computed(() => consumption(this.movementList(), CONSUMPTION_DAYS));
  readonly supplyDays = computed(() => {
    const row = this.row();
    return row ? daysOfSupply(row.cantidad, this.consumed(), CONSUMPTION_DAYS) : null;
  });

  /** Mientras no se conozca el producto de cada receta no se puede enlazar a ella. */
  readonly usageLoading = computed(() => this.usage.isLoading() || this.formulas.isLoading());
  readonly usageFailed = computed(() => !!this.usage.error() || !!this.formulas.error());

  readonly usageRows = computed<RecipeUsageRow[]>(() => {
    const costo = this.row()?.costoPromedio ?? null;
    const formulas = new Map(valueOr(this.formulas, []).map((formula) => [formula.id, formula]));
    return valueOr(this.usage, []).map((line) => {
      const formula = formulas.get(line.formulaId);
      const cantidad = Number(line.cantidad);
      return {
        id: line.id,
        productoId: formula?.productoId ?? null,
        producto: formula?.producto ?? line.formula,
        receta: line.formula,
        cantidad,
        unidad: line.unidadMedida,
        costoLote: costo === null ? null : Math.round(cantidad * costo * 100) / 100,
      };
    });
  });

  reload(): void {
    this.material.reload();
    this.stocks.reload();
    this.movements.reload();
    this.purchases.reload();
    this.usage.reload();
  }
}
