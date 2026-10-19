import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { Id } from '../../../core/models/api.model';
import {
  DOCUMENTO_MAX_LENGTH,
  RawMaterialStock,
  StockMovement,
} from '../../../core/models/inventory.model';
import { RawMaterial } from '../../../core/models/production.model';
import { Notifications } from '../../../core/services/notifications';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { StatusChip } from '../../../shared/ui/status-chip/status-chip';
import {
  MATERIAL_STATUS_CHIP,
  latestCost,
  levelOf,
  projectPurchase,
} from '../raw-material-calc';
import { valueOr } from '../../../core/http/resource-value';
import { InventoryService } from '../services/inventory.service';

/**
 * Registrar una compra: una ENTRADA de materia prima con documento y costo unitario.
 * Muestra cómo quedan la existencia y el costo promedio antes de guardar.
 */
@Component({
  selector: 'app-purchase-drawer',
  imports: [ReactiveFormsModule, DecimalPipe, MoneyPipe, FormDrawer, StatusChip],
  template: `
    <app-form-drawer
      [open]="open()"
      title="Registrar compra"
      subtitle="Sube la existencia y recalcula el costo promedio."
      (closed)="closed.emit()"
    >
      <form id="purchase-form" class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Compra
          </legend>
          <div>
            <label class="label" for="pc-insumo"><span class="label-text">Insumo</span></label>
            <select
              id="pc-insumo"
              formControlName="materiaPrimaId"
              class="select select-bordered w-full"
              [class.select-error]="!!errorFor('materiaPrimaId')"
            >
              <option [ngValue]="0" disabled>Elegí un insumo</option>
              @for (item of options(); track item.id) {
                <option [ngValue]="item.id">{{ item.nombre }} ({{ item.unidadMedida }})</option>
              }
            </select>
            @if (errorFor('materiaPrimaId'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>

          @if (selected() && !stock()) {
            <div role="alert" class="alert alert-warning py-2 text-sm">
              <span>Este insumo todavía no tiene inventario habilitado.</span>
              <button type="button" class="btn btn-sm" [disabled]="opening()" (click)="openStock()">
                @if (opening()) {
                  <span class="loading loading-spinner loading-xs"></span>
                }
                Habilitar inventario
              </button>
            </div>
          }

          <div>
            <label class="label" for="pc-documento"
              ><span class="label-text">N.º de documento (factura o CCF)</span></label
            >
            <input
              id="pc-documento"
              type="text"
              [maxLength]="documentoMax"
              placeholder="Ej. CCF 000322"
              formControlName="documento"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('documento')"
            />
            @if (errorFor('documento'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="pc-cantidad"
                ><span class="label-text">Cantidad{{ unidad() ? ' (' + unidad() + ')' : '' }}</span></label
              >
              <input
                id="pc-cantidad"
                type="number"
                step="0.001"
                min="0"
                inputmode="decimal"
                formControlName="cantidad"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('cantidad')"
              />
              @if (errorFor('cantidad'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
            <div>
              <label class="label" for="pc-costo"
                ><span class="label-text">Costo unitario{{ unidad() ? ' por ' + unidad() : '' }}</span></label
              >
              <input
                id="pc-costo"
                type="number"
                step="0.0001"
                min="0"
                inputmode="decimal"
                formControlName="costoInicial"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('costoInicial')"
              />
              @if (errorFor('costoInicial'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
          </div>
        </fieldset>

        <section aria-label="Así quedaría el insumo" class="flex flex-col gap-2">
          <h3 class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Así quedaría
          </h3>
          @if (preview(); as p) {
            <dl
              class="grid grid-cols-[1fr_auto_auto_auto] items-baseline gap-x-3 gap-y-2 rounded-box bg-base-200 px-4 py-3 text-sm"
              aria-live="polite"
            >
              <dt class="text-base-content/65">Existencia</dt>
              <dd class="tabular-nums">{{ p.existenciaAntes | number: '1.0-3' }}</dd>
              <dd aria-hidden="true">→</dd>
              <dd class="font-semibold tabular-nums">
                {{ p.existenciaDespues | number: '1.0-3' }} {{ unidad() }}
              </dd>

              <dt class="text-base-content/65">Costo promedio</dt>
              <dd class="tabular-nums">{{ p.costoAntes | money }}</dd>
              <dd aria-hidden="true">→</dd>
              <dd class="font-semibold tabular-nums">{{ p.costoDespues | money }}</dd>

              <dt class="text-base-content/65">Estado</dt>
              <dd><app-status-chip [label]="p.estadoAntes.label" [tone]="p.estadoAntes.tone" /></dd>
              <dd aria-hidden="true">→</dd>
              <dd><app-status-chip [label]="p.estadoDespues.label" [tone]="p.estadoDespues.tone" /></dd>
            </dl>
          } @else {
            <p class="rounded-box bg-base-200 px-4 py-3 text-sm text-base-content/60">
              Elegí un insumo con inventario para ver cómo cambian su existencia y su costo promedio.
            </p>
          }
        </section>
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button
          type="submit"
          form="purchase-form"
          class="btn btn-primary"
          [disabled]="saving() || !stock()"
        >
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar compra
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class PurchaseDrawer {
  private readonly service = inject(InventoryService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  /** Insumo fijo (ficha). Sin él, el usuario lo elige. */
  readonly materialId = input<Id | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly documentoMax = DOCUMENTO_MAX_LENGTH;
  protected readonly saving = signal(false);
  protected readonly opening = signal(false);
  protected readonly formError = signal<string | null>(null);
  private readonly selectedId = signal(0);

  protected readonly form = this.fb.group({
    materiaPrimaId: [0, [Validators.min(1)]],
    documento: ['', [Validators.required, Validators.maxLength(DOCUMENTO_MAX_LENGTH)]],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    // El backend llama costoInicial al costo unitario de una entrada.
    costoInicial: [0, [Validators.required, Validators.min(0)]],
  });
  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private readonly materials = httpResource<RawMaterial[]>(
    () => (this.open() ? this.service.materialsUrl() : undefined),
    { defaultValue: [] },
  );
  private readonly stocks = httpResource<RawMaterialStock[]>(
    () => (this.open() ? this.service.stockUrl('materia-prima') : undefined),
    { defaultValue: [] },
  );
  private readonly movements = httpResource<StockMovement[]>(
    () => {
      const id = this.selectedId();
      return this.open() && id > 0 ? this.service.movementsUrl('materia-prima', id) : undefined;
    },
    { defaultValue: [] },
  );

  protected readonly options = computed(() => {
    const fixed = this.materialId();
    return valueOr(this.materials, [])
      .filter((material) => material.activo !== false || material.id === fixed)
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });
  protected readonly selected = computed(
    () => this.options().find((material) => material.id === this.selectedId()) ?? null,
  );
  protected readonly unidad = computed(() => this.selected()?.unidadMedida ?? '');
  protected readonly stock = computed(
    () =>
      valueOr(this.stocks, []).find((item) => item.materiaPrimaId === this.selectedId()) ?? null,
  );

  protected readonly preview = computed(() => {
    const material = this.selected();
    const stock = this.stock();
    if (!material || !stock || this.movements.isLoading() || this.stocks.isLoading()) {
      return null;
    }
    const existencia = Number(stock.cantidad);
    const minimo = Number(material.stockMinimo ?? 0);
    const costoActual = latestCost(valueOr(this.movements, [])) ?? Number(material.precio ?? 0);
    const cantidad = Number(this.values().cantidad) || 0;
    const costoUnitario = Number(this.values().costoInicial) || 0;
    const despues =
      cantidad > 0
        ? projectPurchase(existencia, costoActual, cantidad, costoUnitario)
        : { existencia, costoPromedio: costoActual };
    const chip = (cantidadNivel: number) =>
      MATERIAL_STATUS_CHIP[levelOf(cantidadNivel, minimo)];
    return {
      existenciaAntes: existencia,
      existenciaDespues: despues.existencia,
      costoAntes: costoActual,
      costoDespues: despues.costoPromedio,
      estadoAntes: chip(existencia),
      estadoDespues: chip(despues.existencia),
    };
  });

  constructor() {
    this.form.controls.materiaPrimaId.valueChanges.subscribe((id) => this.selectedId.set(Number(id)));

    effect(() => {
      if (this.open()) {
        const fixed = this.materialId();
        untracked(() => this.reset(fixed));
      }
    });
  }

  protected errorFor(field: string): string | null {
    const control = this.form.get(field);
    if (control?.hasError('min') && control.touched) {
      if (field === 'materiaPrimaId') return 'Elegí un insumo.';
      return field === 'cantidad'
        ? 'Ingresá una cantidad mayor que cero.'
        : 'No puede ser negativo.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected openStock(): void {
    const id = this.selectedId();
    if (id <= 0) return;
    this.opening.set(true);
    this.service.openStock('materia-prima', id).subscribe({
      next: () => {
        this.opening.set(false);
        this.notifications.success(`Inventario de "${this.selected()?.nombre}" habilitado.`);
        this.stocks.reload();
      },
      error: () => this.opening.set(false),
    });
  }

  protected save(): void {
    const stock = this.stock();
    if (!stock) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const material = this.selected();

    this.saving.set(true);
    this.formError.set(null);
    this.service
      .registerMovement('materia-prima', {
        inventarioId: stock.id,
        tipo: 'ENTRADA',
        cantidad: Number(value.cantidad),
        motivo: 'Compra',
        documento: value.documento.trim(),
        costoInicial: Number(value.costoInicial),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success(
            `Compra registrada: ${value.cantidad} ${material?.unidadMedida ?? ''} de "${material?.nombre ?? 'insumo'}".`,
          );
          this.saved.emit();
        },
        error: (error: AppError) => {
          this.saving.set(false);
          applyFieldErrors(this.form, error);
          this.formError.set(formLevelMessage(error));
        },
      });
  }

  private reset(fixed: Id | null): void {
    this.formError.set(null);
    this.form.reset({
      materiaPrimaId: fixed ?? 0,
      documento: '',
      cantidad: 0,
      costoInicial: 0,
    });
    this.selectedId.set(fixed ?? 0);
    if (fixed !== null) {
      this.form.controls.materiaPrimaId.disable({ emitEvent: false });
    } else {
      this.form.controls.materiaPrimaId.enable({ emitEvent: false });
    }
  }
}
