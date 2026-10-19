import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { AppError } from '../../../core/http/app-error';
import { applyFieldErrors, formLevelMessage } from '../../../core/http/form-errors';
import { valueOr } from '../../../core/http/resource-value';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { ProductStock, RawMaterialStock } from '../../../core/models/inventory.model';
import { RawMaterial } from '../../../core/models/production.model';
import {
  TRANSFER_NOTE_MAX_LENGTH,
  Transfer,
  TransferDraft,
  TransferLineDraft,
} from '../../../core/models/transfer.model';
import { BranchScope } from '../../../core/services/branch-scope';
import { Notifications } from '../../../core/services/notifications';
import { todayIso } from '../../../core/utils/dates';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { Icon } from '../../../shared/ui/icon/icon';
import { InventoryService } from '../../raw-materials/services/inventory.service';
import { TransferService } from '../services/transfer.service';
import { branchesError, itemKey, parseItemKey, shortages } from '../transfer-calc';

interface ItemOption {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
}

/**
 * Nuevo traslado: sucursal de origen y de destino, fecha, nota y una o más líneas (insumo o producto)
 * con su cantidad. Cada línea muestra lo que hay en el origen; no se puede pedir más de eso. Al guardar,
 * el backend registra la salida y la entrada con el mismo documento y costo, todo en una operación.
 */
@Component({
  selector: 'app-transfer-form-drawer',
  imports: [ReactiveFormsModule, DecimalPipe, FormDrawer, Icon],
  template: `
    <app-form-drawer
      [open]="open()"
      title="Nuevo traslado"
      subtitle="Saca existencia de una sucursal y la entrega a otra, con el mismo costo."
      (closed)="closed.emit()"
    >
      <form id="transfer-form" class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }

        <fieldset class="flex flex-col gap-3">
          <legend class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Sucursales
          </legend>

          <div class="grid gap-3 sm:grid-cols-2">
            <div>
              <label class="mb-1.5 block text-sm font-semibold" for="nt-origen">Origen</label>
              <select
                id="nt-origen"
                formControlName="sucursalOrigenId"
                class="select select-bordered w-full"
                [class.select-error]="!!branchMessage() || originMissing()"
              >
                <option [ngValue]="0" disabled>Elegí el origen</option>
                @for (branch of scope.activeBranches(); track branch.id) {
                  <option [ngValue]="branch.id">{{ branch.nombre }}</option>
                }
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold" for="nt-destino">Destino</label>
              <select
                id="nt-destino"
                formControlName="sucursalDestinoId"
                class="select select-bordered w-full"
                [class.select-error]="!!branchMessage() || destinationMissing()"
              >
                <option [ngValue]="0" disabled>Elegí el destino</option>
                @for (branch of scope.activeBranches(); track branch.id) {
                  <option [ngValue]="branch.id">{{ branch.nombre }}</option>
                }
              </select>
            </div>
          </div>
          @if (branchMessage(); as message) {
            <p class="text-xs text-error">{{ message }}</p>
          } @else if (originMissing() || destinationMissing()) {
            <p class="text-xs text-error">Elegí el origen y el destino.</p>
          }

          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="nt-fecha">Fecha</label>
            <input
              id="nt-fecha"
              type="date"
              [max]="today"
              formControlName="fecha"
              class="input input-bordered w-full"
              [class.input-error]="form.controls.fecha.invalid && form.controls.fecha.touched"
            />
            @if (form.controls.fecha.invalid && form.controls.fecha.touched) {
              <p class="mt-1 text-xs text-error">Indicá la fecha del traslado (no puede ser futura).</p>
            }
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="nt-nota">Nota</label>
            <textarea
              id="nt-nota"
              rows="2"
              [maxLength]="noteMax"
              placeholder="Opcional. Ej. Reposición semanal"
              formControlName="nota"
              class="textarea textarea-bordered w-full"
            ></textarea>
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-3">
          <legend class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Qué se traslada
          </legend>

          <div formArrayName="lineas" class="flex flex-col gap-3">
            @for (line of lines.controls; track line; let i = $index) {
              <div
                [formGroupName]="i"
                class="flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-3.5"
              >
                <div class="flex items-end gap-2">
                  <div class="min-w-0 flex-1">
                    <label class="mb-1.5 block text-sm font-semibold" [for]="'nt-item-' + i">
                      Línea {{ i + 1 }}
                    </label>
                    <select
                      [id]="'nt-item-' + i"
                      formControlName="item"
                      class="select select-bordered w-full"
                      [class.select-error]="lineInvalid(i, 'item')"
                    >
                      <option value="" disabled>Elegí un insumo o producto</option>
                      @if (materialOptions().length) {
                        <optgroup label="Materia prima">
                          @for (option of materialOptions(); track option.key) {
                            <option [value]="option.key">{{ option.label }}</option>
                          }
                        </optgroup>
                      }
                      @if (productOptions().length) {
                        <optgroup label="Producto">
                          @for (option of productOptions(); track option.key) {
                            <option [value]="option.key">{{ option.label }}</option>
                          }
                        </optgroup>
                      }
                    </select>
                  </div>
                  <button
                    type="button"
                    class="btn btn-ghost btn-square text-error"
                    [attr.aria-label]="'Quitar la línea ' + (i + 1)"
                    [disabled]="lines.length === 1"
                    (click)="removeLine(i)"
                  >
                    <app-icon name="trash" [size]="16" />
                  </button>
                </div>

                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] items-end gap-2">
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold" [for]="'nt-cant-' + i">
                      Cantidad{{ unitOf(i) ? ' (' + unitOf(i) + ')' : '' }}
                    </label>
                    <input
                      [id]="'nt-cant-' + i"
                      type="number"
                      step="0.001"
                      min="0"
                      inputmode="decimal"
                      formControlName="cantidad"
                      class="input input-bordered w-full"
                      [class.input-error]="lineInvalid(i, 'cantidad') || over(i)"
                    />
                  </div>
                  <div class="text-end">
                    <span class="mb-1.5 block text-xs font-semibold text-base-content/60">
                      Disponible en {{ originName() || 'el origen' }}
                    </span>
                    <span
                      class="block py-2 font-semibold tabular-nums"
                      [class.text-error]="over(i)"
                      aria-live="polite"
                    >
                      @if (availableOf(i) === null) {
                        —
                      } @else {
                        {{ availableOf(i) | number: '1.0-3' }} {{ unitOf(i) }}
                      }
                    </span>
                  </div>
                </div>
                @if (lineMessage(i); as message) {
                  <p class="-mt-1 text-xs text-error">{{ message }}</p>
                }
              </div>
            }
          </div>

          <button type="button" class="btn btn-sm self-start" (click)="addLine()">
            <app-icon name="plus" [size]="16" /> Agregar línea
          </button>
        </fieldset>

        @if (shortageMessages().length > 0) {
          <div role="alert" class="alert alert-warning py-2 text-sm">
            <ul class="list-disc pl-4">
              @for (message of shortageMessages(); track message) {
                <li>{{ message }}</li>
              }
            </ul>
          </div>
        }
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="transfer-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Registrar traslado
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class TransferFormDrawer {
  private readonly transfers = inject(TransferService);
  private readonly inventory = inject(InventoryService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;
  protected readonly scope = inject(BranchScope);

  readonly open = input(false);
  readonly closed = output<void>();
  readonly saved = output<Transfer>();

  protected readonly noteMax = TRANSFER_NOTE_MAX_LENGTH;
  protected readonly today = todayIso();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    sucursalOrigenId: [0, [Validators.min(1)]],
    sucursalDestinoId: [0, [Validators.min(1)]],
    fecha: [todayIso(), [Validators.required]],
    nota: ['', [Validators.maxLength(TRANSFER_NOTE_MAX_LENGTH)]],
    lineas: this.fb.array([this.createLine()]),
  });
  protected readonly lines = this.form.controls.lineas;

  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  private readonly origin = computed(() => this.values().sucursalOrigenId);

  private readonly materialRes = httpResource<RawMaterial[]>(
    () => (this.open() ? this.inventory.materialsUrl() : undefined),
    { defaultValue: [] },
  );
  private readonly productRes = httpResource<CatalogProduct[]>(
    () => (this.open() ? this.inventory.productsUrl() : undefined),
    { defaultValue: [] },
  );
  /** Lo que hay en el origen elegido: se vuelve a pedir si cambia el origen. */
  private readonly materialStockRes = httpResource<RawMaterialStock[]>(
    () =>
      this.open() && this.origin() > 0
        ? this.inventory.stockUrl('materia-prima', { sucursalId: this.origin() })
        : undefined,
    { defaultValue: [] },
  );
  private readonly productStockRes = httpResource<ProductStock[]>(
    () =>
      this.open() && this.origin() > 0
        ? this.inventory.stockUrl('producto', { sucursalId: this.origin() })
        : undefined,
    { defaultValue: [] },
  );

  protected readonly materialOptions = computed<readonly ItemOption[]>(() =>
    valueOr(this.materialRes, [])
      .filter((material) => material.activo !== false)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((material) => ({
        key: itemKey({ kind: 'materia-prima', id: material.id }),
        label: `${material.nombre} (${material.unidadMedida})`,
        unit: material.unidadMedida,
      })),
  );
  protected readonly productOptions = computed<readonly ItemOption[]>(() =>
    valueOr(this.productRes, [])
      .filter((product) => product.activo)
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((product) => ({
        key: itemKey({ kind: 'producto', id: product.id }),
        label: `${product.nombre} (${product.unidadVenta})`,
        unit: product.unidadVenta,
      })),
  );
  private readonly optionsByKey = computed(
    () => new Map([...this.materialOptions(), ...this.productOptions()].map((option) => [option.key, option])),
  );

  /** Existencia del origen por artículo; un artículo sin inventario ahí cuenta como cero. */
  private readonly available = computed(() => {
    const stock = new Map<string, number>();
    for (const row of valueOr(this.materialStockRes, [])) {
      stock.set(itemKey({ kind: 'materia-prima', id: row.materiaPrimaId }), Number(row.cantidad));
    }
    for (const row of valueOr(this.productStockRes, [])) {
      stock.set(itemKey({ kind: 'producto', id: row.productoId }), Number(row.cantidad));
    }
    return stock;
  });
  private readonly stockReady = computed(
    () =>
      this.origin() > 0 &&
      this.materialStockRes.hasValue() &&
      this.productStockRes.hasValue() &&
      !this.materialStockRes.isLoading() &&
      !this.productStockRes.isLoading(),
  );

  protected readonly originName = computed(() => this.scope.nameOf(this.origin()));
  protected readonly branchMessage = computed(() => {
    const raw = this.values();
    return branchesError(raw.sucursalOrigenId || null, raw.sucursalDestinoId || null);
  });
  protected readonly originMissing = computed(
    () => this.form.controls.sucursalOrigenId.touched && this.origin() < 1,
  );
  protected readonly destinationMissing = computed(
    () => this.form.controls.sucursalDestinoId.touched && this.values().sucursalDestinoId < 1,
  );

  private readonly requested = computed(() =>
    this.values().lineas.map((line) => ({
      ref: parseItemKey(line.item),
      cantidad: Number(line.cantidad) || 0,
    })),
  );

  /** Artículos que el origen no alcanza a cubrir, ya sumando las líneas repetidas. */
  protected readonly shortageMessages = computed(() => {
    if (!this.stockReady()) return [];
    return shortages(this.requested(), this.available()).map((item) => {
      const option = this.optionsByKey().get(item.key);
      const unit = option ? ` ${option.unit}` : '';
      const name = option ? option.label.replace(/\s*\([^)]*\)$/, '') : item.key;
      return `${name}: pedís ${this.format(item.requested)}${unit} y en ${this.originName() || 'el origen'} hay ${this.format(item.available)}${unit}.`;
    });
  });

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const own = this.scope.ownBranchId();
      const active = this.scope.activeBranches();
      untracked(() => this.reset(own, active.map((branch) => branch.id)));
    });
  }

  protected unitOf(index: number): string {
    return this.optionsByKey().get(this.values().lineas[index]?.item ?? '')?.unit ?? '';
  }

  /** Existencia del origen para el artículo de la línea; null mientras no haya origen, artículo o datos. */
  protected availableOf(index: number): number | null {
    const key = this.values().lineas[index]?.item ?? '';
    if (!key || !this.stockReady()) return null;
    return this.available().get(key) ?? 0;
  }

  /** La línea pide más de lo que hay (contando las demás líneas del mismo artículo). */
  protected over(index: number): boolean {
    const key = this.values().lineas[index]?.item ?? '';
    return (
      !!key &&
      this.stockReady() &&
      shortages(this.requested(), this.available()).some((item) => item.key === key)
    );
  }

  protected lineInvalid(index: number, field: 'item' | 'cantidad'): boolean {
    const control = this.lines.at(index).controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected lineMessage(index: number): string | null {
    const { item, cantidad } = this.lines.at(index).controls;
    if (item.invalid && item.touched) return 'Elegí qué se traslada.';
    if (cantidad.invalid && cantidad.touched) return 'Ingresá una cantidad mayor que cero.';
    return null;
  }

  protected addLine(): void {
    this.lines.push(this.createLine());
  }

  protected removeLine(index: number): void {
    if (this.lines.length > 1) {
      this.lines.removeAt(index);
    }
  }

  protected save(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.branchMessage()) {
      return;
    }
    if (this.shortageMessages().length > 0) {
      this.formError.set('El origen no tiene existencia suficiente para todo lo que pediste. Revisá las cantidades.');
      return;
    }
    const raw = this.form.getRawValue();

    const lineas: TransferLineDraft[] = [];
    for (const line of raw.lineas) {
      const ref = parseItemKey(line.item);
      if (!ref) {
        this.formError.set('Elegí qué se traslada en todas las líneas.');
        return;
      }
      lineas.push({
        ...(ref.kind === 'producto' ? { productoId: ref.id } : { materiaPrimaId: ref.id }),
        cantidad: Number(line.cantidad),
      });
    }

    const draft: TransferDraft = {
      sucursalOrigenId: raw.sucursalOrigenId,
      sucursalDestinoId: raw.sucursalDestinoId,
      fecha: raw.fecha,
      nota: raw.nota.trim(),
      lineas,
    };

    this.saving.set(true);
    this.formError.set(null);
    this.transfers.create(draft).subscribe({
      next: (transfer) => {
        this.saving.set(false);
        this.notifications.success(`Traslado ${transfer.documento} registrado.`);
        this.saved.emit(transfer);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        applyFieldErrors(this.form, error);
        // Existencia insuficiente, sucursal desactivada…: el backend lo explica en el mensaje.
        const unmatched = Object.entries(error.fieldErrors)
          .filter(([field]) => !this.form.get(field))
          .map(([, message]) => message);
        this.formError.set(unmatched.length > 0 ? unmatched.join(' ') : formLevelMessage(error));
      },
    });
  }

  private format(value: number): string {
    return String(Math.round(value * 1000) / 1000);
  }

  private createLine() {
    return this.fb.group({
      item: ['', [Validators.required]],
      cantidad: [0, [Validators.required, Validators.min(0.001)]],
    });
  }

  /** Origen: la sucursal del usuario; destino: la primera activa distinta. */
  private reset(ownBranchId: number | null, activeIds: readonly number[]): void {
    this.formError.set(null);
    this.saving.set(false);

    const origin = ownBranchId !== null && activeIds.includes(ownBranchId) ? ownBranchId : (activeIds[0] ?? 0);
    const destination = activeIds.find((id) => id !== origin) ?? 0;

    this.form.reset({
      sucursalOrigenId: origin,
      sucursalDestinoId: destination,
      fecha: todayIso(),
      nota: '',
    });
    this.lines.clear();
    this.lines.push(this.createLine());
  }
}
