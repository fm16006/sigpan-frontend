import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { map } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { AppError } from '../../../core/http/app-error';
import { AltUnit } from '../../../core/models/stock-control.model';
import { applyFieldErrors, firstErrorMessage } from '../../../core/http/form-errors';
import { valueOr } from '../../../core/http/resource-value';
import { Id } from '../../../core/models/api.model';
import { CatalogProduct } from '../../../core/models/catalog.model';
import {
  DOCUMENT_TYPES,
  DOCUMENT_TYPE_LABELS,
  DocumentType,
  PURCHASE_DOCUMENT_MAX_LENGTH,
  Purchase,
  PurchaseDraft,
  PurchaseLineDraft,
  Supplier,
} from '../../../core/models/purchase.model';
import { RawMaterial } from '../../../core/models/production.model';
import { Notifications } from '../../../core/services/notifications';
import { todayIso } from '../../../core/utils/dates';
import { MoneyPipe } from '../../../shared/pipes/money.pipe';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { Icon } from '../../../shared/ui/icon/icon';
import { InventoryService } from '../../raw-materials/services/inventory.service';
import { SupplierService } from '../../suppliers/services/supplier.service';
import {
  PurchaseItemRef,
  documentLabel,
  itemKey,
  lineSubtotal,
  parseItemKey,
  purchaseTotal,
} from '../purchase-calc';
import { PurchaseService } from '../services/purchase.service';

interface ItemOption {
  readonly key: string;
  readonly label: string;
  readonly unit: string;
}

/**
 * Nueva compra: proveedor, documento, fecha y una o más líneas (insumo o producto de reventa)
 * con su cantidad y costo unitario. Al guardar, el backend crea una entrada de inventario por
 * línea y actualiza el costo promedio, todo en una sola operación.
 */
@Component({
  selector: 'app-purchase-form-drawer',
  imports: [ReactiveFormsModule, DecimalPipe, MoneyPipe, FormDrawer, Icon],
  template: `
    <app-form-drawer
      [open]="open()"
      title="Nueva compra"
      subtitle="Cada línea sube la existencia y recalcula el costo promedio."
      (closed)="closed.emit()"
    >
      <form id="purchase-form" class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }

        <fieldset class="flex flex-col gap-3">
          <legend class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Documento
          </legend>

          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="np-proveedor">Proveedor</label>
            <select
              id="np-proveedor"
              formControlName="proveedorId"
              class="select select-bordered w-full"
              [class.select-error]="!!errorFor('proveedorId')"
            >
              <option [ngValue]="0" disabled>Elegí un proveedor</option>
              @for (supplier of supplierOptions(); track supplier.id) {
                <option [ngValue]="supplier.id">{{ supplier.nombre }}</option>
              }
            </select>
            @if (errorFor('proveedorId'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            } @else if (suppliersLoaded() && supplierOptions().length === 0) {
              <p class="mt-1 text-xs text-warning">
                No hay proveedores activos. Registralos primero en Inventario › Proveedores.
              </p>
            }
          </div>

          <div class="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
            <div>
              <label class="mb-1.5 block text-sm font-semibold" for="np-tipo">Tipo de documento</label>
              <select id="np-tipo" formControlName="tipoDocumento" class="select select-bordered w-full">
                @for (type of documentTypes; track type) {
                  <option [value]="type">{{ typeLabels[type] }}</option>
                }
              </select>
            </div>
            <div>
              <label class="mb-1.5 block text-sm font-semibold" for="np-numero">N.º de documento</label>
              <input
                id="np-numero"
                type="text"
                [maxLength]="documentMax"
                placeholder="Ej. 000322"
                formControlName="numeroDocumento"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('numeroDocumento')"
              />
              @if (errorFor('numeroDocumento'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-semibold" for="np-fecha">Fecha del documento</label>
            <input
              id="np-fecha"
              type="date"
              [max]="today"
              formControlName="fecha"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('fecha')"
            />
            @if (errorFor('fecha'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>
        </fieldset>

        <fieldset class="flex flex-col gap-3">
          <legend class="mb-1 text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Qué se compró
          </legend>

          <div formArrayName="lineas" class="flex flex-col gap-3">
            @for (line of lines.controls; track line; let i = $index) {
              <div
                [formGroupName]="i"
                class="flex flex-col gap-3 rounded-box border border-base-300 bg-base-100 p-3.5"
              >
                <div class="flex items-end gap-2">
                  <div class="min-w-0 flex-1">
                    <label class="mb-1.5 block text-sm font-semibold" [for]="'np-item-' + i">
                      Línea {{ i + 1 }}
                    </label>
                    <select
                      [id]="'np-item-' + i"
                      formControlName="item"
                      class="select select-bordered w-full"
                      [class.select-error]="lineError(i, 'item')"
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
                        <optgroup label="Producto de reventa">
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

                <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,0.9fr)] items-end gap-2">
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold" [for]="'np-cant-' + i">
                      Cantidad{{ unitOf(i) ? ' (' + unitOf(i) + ')' : '' }}
                    </label>
                    <input
                      [id]="'np-cant-' + i"
                      type="number"
                      step="0.001"
                      min="0"
                      inputmode="decimal"
                      formControlName="cantidad"
                      class="input input-bordered w-full"
                      [class.input-error]="lineError(i, 'cantidad')"
                    />
                  </div>
                  <div>
                    <label class="mb-1.5 block text-xs font-semibold" [for]="'np-costo-' + i">
                      Costo unitario
                    </label>
                    <input
                      [id]="'np-costo-' + i"
                      type="number"
                      step="0.0001"
                      min="0"
                      inputmode="decimal"
                      formControlName="costoUnitario"
                      class="input input-bordered w-full"
                      [class.input-error]="lineError(i, 'costoUnitario')"
                    />
                  </div>
                  <div class="text-end">
                    <span class="mb-1.5 block text-xs font-semibold text-base-content/60">Subtotal</span>
                    <span class="block py-2 font-semibold tabular-nums">{{ subtotalOf(i) | money }}</span>
                  </div>
                </div>
                @if (materialOf(i); as materialId) {
                  <div class="grid gap-2 sm:grid-cols-3">
                    <label class="text-xs font-semibold">
                      Unidad de compra
                      <select class="select select-bordered select-sm mt-1 w-full" formControlName="unidadId">
                        <option [ngValue]="null">{{ unitOf(i) || 'Unidad base' }}</option>
                        @for (u of altUnits()[materialId] ?? []; track u.id) {
                          <option [ngValue]="u.id">{{ u.nombre }} (= {{ u.factor }} {{ u.unidadBase }})</option>
                        }
                      </select>
                    </label>
                    <label class="text-xs font-semibold">
                      Lote (opcional)
                      <input class="input input-bordered input-sm mt-1 w-full" maxlength="40" formControlName="lote" />
                    </label>
                    <label class="text-xs font-semibold">
                      Vence (opcional)
                      <input class="input input-bordered input-sm mt-1 w-full" type="date" formControlName="fechaVencimiento" />
                    </label>
                  </div>
                }
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

        <section
          aria-label="Total de la compra"
          class="flex items-baseline justify-between gap-3 rounded-box bg-base-200 px-4 py-3.5"
          aria-live="polite"
        >
          <span class="text-sm text-base-content/70">
            Total · {{ filledLines() }} {{ filledLines() === 1 ? 'línea' : 'líneas' }}
            @if (units() > 0) {
              · {{ units() | number: '1.0-3' }} unidades
            }
          </span>
          <span class="font-serif text-3xl font-semibold tabular-nums">{{ total() | money }}</span>
        </section>
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button type="submit" form="purchase-form" class="btn btn-primary" [disabled]="saving()">
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Registrar compra
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class PurchaseFormDrawer {
  private readonly purchases = inject(PurchaseService);
  private readonly suppliers = inject(SupplierService);
  private readonly inventory = inject(InventoryService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly api = inject(ApiClient);

  /** HU-66: unidades alternas por insumo, se cargan al elegirlo. */
  protected readonly altUnits = signal<Record<number, readonly AltUnit[]>>({});

  /** Id del insumo de la línea, o null si es producto o está vacía. */
  protected materialOf(index: number): number | null {
    const ref = parseItemKey(this.values().lineas[index]?.item ?? '');
    if (!ref || ref.kind === 'producto') return null;
    return Number(ref.id);
  }

  private readonly loadUnits = effect(() => {
    const ids = this.values()
      .lineas.map((_, i) => this.materialOf(i))
      .filter((id): id is number => id !== null);
    untracked(() => {
      for (const id of ids) {
        if (id in this.altUnits()) continue;
        this.altUnits.update((m) => ({ ...m, [id]: [] }));
        this.api.get<AltUnit[]>(API_ENDPOINTS.materiasPrimas.unidades(id)).subscribe({
          next: (units) => this.altUnits.update((m) => ({ ...m, [id]: units })),
        });
      }
    });
  });

  readonly open = input(false);
  /** Proveedor fijo (ficha del proveedor). Sin él, se elige. */
  readonly supplierId = input<Id | null>(null);
  /** Ítem que arranca elegido en la primera línea (ficha de un insumo o producto). */
  readonly presetItem = input<PurchaseItemRef | null>(null);
  readonly closed = output<void>();
  readonly saved = output<Purchase>();

  protected readonly documentTypes = DOCUMENT_TYPES;
  protected readonly typeLabels = DOCUMENT_TYPE_LABELS;
  protected readonly documentMax = PURCHASE_DOCUMENT_MAX_LENGTH;
  protected readonly today = todayIso();

  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);

  protected readonly form = this.fb.group({
    proveedorId: [0, [Validators.min(1)]],
    tipoDocumento: ['FACTURA' as DocumentType, [Validators.required]],
    numeroDocumento: ['', [Validators.required, Validators.maxLength(PURCHASE_DOCUMENT_MAX_LENGTH)]],
    fecha: [todayIso(), [Validators.required]],
    lineas: this.fb.array([this.createLine()]),
  });
  protected readonly lines = this.form.controls.lineas;

  private readonly values = toSignal(
    this.form.valueChanges.pipe(map(() => this.form.getRawValue())),
    { initialValue: this.form.getRawValue() },
  );

  private readonly supplierRes = httpResource<Supplier[]>(
    () => (this.open() ? this.suppliers.suppliersUrl(true) : undefined),
    { defaultValue: [] },
  );
  private readonly materialRes = httpResource<RawMaterial[]>(
    () => (this.open() ? this.inventory.materialsUrl() : undefined),
    { defaultValue: [] },
  );
  private readonly productRes = httpResource<CatalogProduct[]>(
    () => (this.open() ? this.purchases.resaleProductsUrl() : undefined),
    { defaultValue: [] },
  );

  protected readonly suppliersLoaded = computed(() => this.supplierRes.hasValue());
  protected readonly supplierOptions = computed(() =>
    [...valueOr(this.supplierRes, [])].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
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
      .filter((product) => product.activo && product.tipo === 'REVENTA')
      .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
      .map((product) => ({
        key: itemKey({ kind: 'producto', id: product.id }),
        label: `${product.nombre} (${product.unidadVenta})`,
        unit: product.unidadVenta,
      })),
  );
  private readonly unitsByKey = computed(
    () =>
      new Map([...this.materialOptions(), ...this.productOptions()].map((option) => [option.key, option.unit])),
  );

  protected readonly total = computed(() => purchaseTotal(this.values().lineas));
  protected readonly filledLines = computed(
    () => this.values().lineas.filter((line) => line.item !== '').length,
  );
  protected readonly units = computed(() =>
    this.values().lineas.reduce((sum, line) => sum + (Number(line.cantidad) || 0), 0),
  );

  constructor() {
    effect(() => {
      if (!this.open()) {
        return;
      }
      const supplierId = this.supplierId();
      const preset = this.presetItem();
      untracked(() => this.reset(supplierId, preset));
    });
  }

  protected unitOf(index: number): string {
    return this.unitsByKey().get(this.values().lineas[index]?.item ?? '') ?? '';
  }

  protected subtotalOf(index: number): number {
    const line = this.values().lineas[index];
    return line ? lineSubtotal(line.cantidad, line.costoUnitario) : 0;
  }

  protected errorFor(field: string): string | null {
    if (field === 'proveedorId') {
      const control = this.form.controls.proveedorId;
      return control.touched && control.hasError('min') ? 'Elegí un proveedor.' : null;
    }
    return firstErrorMessage(this.form, field);
  }

  protected lineError(index: number, field: 'item' | 'cantidad' | 'costoUnitario'): boolean {
    const control = this.lines.at(index).controls[field];
    return control.invalid && (control.touched || control.dirty);
  }

  protected lineMessage(index: number): string | null {
    const group = this.lines.at(index);
    const { item, cantidad, costoUnitario } = group.controls;
    if (item.invalid && item.touched) return 'Elegí qué se compró.';
    if (cantidad.invalid && cantidad.touched) return 'Ingresá una cantidad mayor que cero.';
    if (costoUnitario.invalid && costoUnitario.touched) return 'El costo unitario no puede ser negativo.';
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
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();

    const lineas: PurchaseLineDraft[] = [];
    for (const line of raw.lineas) {
      const ref = parseItemKey(line.item);
      if (!ref) {
        this.formError.set('Elegí qué se compró en todas las líneas.');
        return;
      }
      lineas.push({
        ...(ref.kind === 'producto' ? { productoId: ref.id } : { materiaPrimaId: ref.id }),
        cantidad: Number(line.cantidad),
        costoUnitario: Number(line.costoUnitario),
        ...(ref.kind !== 'producto' && line.unidadId ? { unidadId: line.unidadId } : {}),
        ...(ref.kind !== 'producto' && line.lote.trim() ? { lote: line.lote.trim() } : {}),
        ...(ref.kind !== 'producto' && line.fechaVencimiento ? { fechaVencimiento: line.fechaVencimiento } : {}),
      });
    }

    const draft: PurchaseDraft = {
      proveedorId: raw.proveedorId,
      tipoDocumento: raw.tipoDocumento,
      numeroDocumento: raw.numeroDocumento.trim(),
      fecha: raw.fecha,
      lineas,
    };

    this.saving.set(true);
    this.formError.set(null);
    this.purchases.create(draft).subscribe({
      next: (purchase) => {
        this.saving.set(false);
        this.notifications.success(
          `Compra ${documentLabel(purchase.tipoDocumento, purchase.numeroDocumento)} registrada.`,
        );
        this.saved.emit(purchase);
      },
      error: (error: AppError) => {
        this.saving.set(false);
        this.showError(error);
      },
    });
  }

  private showError(error: AppError): void {
    if (error.kind === 'conflict') {
      // 409: el proveedor ya tiene una compra con ese documento.
      this.form.controls.numeroDocumento.setErrors({ server: error.message });
      this.form.controls.numeroDocumento.markAsTouched();
      this.formError.set(error.message);
      return;
    }
    applyFieldErrors(this.form, error);
    // Los errores de las líneas llegan como «lineas[0].cantidad»: se juntan en un solo aviso.
    const unmatched = Object.entries(error.fieldErrors)
      .filter(([field]) => !this.form.get(field))
      .map(([, message]) => message);
    this.formError.set(
      unmatched.length > 0
        ? unmatched.join(' ')
        : Object.keys(error.fieldErrors).length === 0
          ? error.message
          : null,
    );
  }

  private createLine() {
    return this.fb.group({
      item: ['', [Validators.required]],
      cantidad: [0, [Validators.required, Validators.min(0.001)]],
      costoUnitario: [0, [Validators.required, Validators.min(0)]],
      unidadId: [null as number | null],
      lote: [''],
      fechaVencimiento: [''],
    });
  }

  private reset(supplierId: Id | null, preset: PurchaseItemRef | null): void {
    this.formError.set(null);
    this.saving.set(false);

    this.form.reset({
      proveedorId: supplierId ?? 0,
      tipoDocumento: 'FACTURA',
      numeroDocumento: '',
      fecha: todayIso(),
    });

    this.lines.clear();
    const first = this.createLine();
    if (preset) {
      first.controls.item.setValue(itemKey(preset));
    }
    this.lines.push(first);
    if (supplierId !== null) {
      this.form.controls.proveedorId.disable({ emitEvent: false });
    } else {
      this.form.controls.proveedorId.enable({ emitEvent: false });
    }
  }
}
