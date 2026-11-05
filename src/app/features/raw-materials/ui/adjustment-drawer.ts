import { DecimalPipe } from '@angular/common';
import { httpResource } from '@angular/common/http';
import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../core/http/form-errors';
import { Id } from '../../../core/models/api.model';
import { CatalogProduct } from '../../../core/models/catalog.model';
import {
  DOCUMENTO_MAX_LENGTH,
  MovementType,
  ProductStock,
  RawMaterialStock,
  StockKind,
} from '../../../core/models/inventory.model';
import { RawMaterial } from '../../../core/models/production.model';
import { Notifications } from '../../../core/services/notifications';
import { FormDrawer } from '../../../shared/ui/form-drawer/form-drawer';
import { documentoObligatorio } from '../movement-document';
import { valueOr } from '../../../core/http/resource-value';
import { InventoryService } from '../services/inventory.service';

interface ItemOption {
  readonly id: Id;
  readonly nombre: string;
  readonly unidad: string;
  readonly cantidad: number;
  /** null cuando el artículo todavía no tiene inventario habilitado. */
  readonly inventarioId: Id | null;
}

/**
 * Salida o ajuste de inventario (ENTRADA o SALIDA con motivo). Con `materialId` el insumo
 * es fijo (ficha); sin él se elige el tipo de artículo y el artículo (Movimientos).
 */
@Component({
  selector: 'app-adjustment-drawer',
  imports: [ReactiveFormsModule, DecimalPipe, FormDrawer],
  template: `
    <app-form-drawer
      [open]="open()"
      [title]="title()"
      subtitle="Los movimientos no se editan ni se borran: un error se corrige con otro ajuste."
      (closed)="closed.emit()"
    >
      <form id="adjustment-form" class="flex flex-col gap-6" [formGroup]="form" (ngSubmit)="save()">
        @if (formError(); as message) {
          <div role="alert" class="alert alert-error py-2 text-sm">{{ message }}</div>
        }

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Artículo
          </legend>
          @if (!materialId()) {
            <div>
              <label class="label" for="aj-kind"><span class="label-text">Tipo de artículo</span></label>
              <select id="aj-kind" formControlName="kind" class="select select-bordered w-full">
                <option value="materia-prima">Materia prima</option>
                <option value="producto">Producto</option>
              </select>
            </div>
          }
          <div>
            <label class="label" for="aj-item"><span class="label-text">Artículo</span></label>
            <select
              id="aj-item"
              formControlName="itemId"
              class="select select-bordered w-full"
              [class.select-error]="!!errorFor('itemId')"
            >
              <option [ngValue]="0" disabled>Elegí un artículo</option>
              @for (item of options(); track item.id) {
                <option [ngValue]="item.id">
                  {{ item.nombre }}{{ item.inventarioId === null ? ' · sin inventario' : '' }}
                </option>
              }
            </select>
            @if (errorFor('itemId'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>

          @if (item(); as current) {
            @if (current.inventarioId === null) {
              <div role="alert" class="alert alert-warning py-2 text-sm">
                <span>“{{ current.nombre }}” todavía no tiene inventario habilitado.</span>
                <button type="button" class="btn btn-sm" [disabled]="opening()" (click)="openStock()">
                  @if (opening()) {
                    <span class="loading loading-spinner loading-xs"></span>
                  }
                  Habilitar inventario
                </button>
              </div>
            } @else {
              <p class="text-sm text-base-content/65">
                Existencia actual:
                <b class="tabular-nums text-base-content"
                  >{{ current.cantidad | number: '1.0-3' }} {{ current.unidad }}</b
                >
              </p>
            }
          }
        </fieldset>

        <fieldset class="flex flex-col gap-4">
          <legend class="text-[0.68rem] font-semibold uppercase tracking-[0.09em] text-base-content/55">
            Movimiento
          </legend>
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label class="label" for="aj-tipo"><span class="label-text">Tipo</span></label>
              <select id="aj-tipo" formControlName="tipo" class="select select-bordered w-full">
                <option value="SALIDA">Salida (baja existencia)</option>
                <option value="ENTRADA" [disabled]="form.controls.clase.value === 'MERMA'">Entrada (sube existencia)</option>
              </select>
            </div>
            @if (kind() === 'materia-prima') {
              <div class="sm:col-span-2">
                <label class="label" for="aj-clase"><span class="label-text">Clase</span></label>
                <select id="aj-clase" formControlName="clase" class="select select-bordered w-full">
                  <option value="AJUSTE">Ajuste (corrección de existencia)</option>
                  <option value="MERMA">Merma (pérdida: vencido, dañado, derrame)</option>
                </select>
              </div>
            }
            <div>
              <label class="label" for="aj-cantidad"
                ><span class="label-text">Cantidad{{ item() ? ' (' + item()!.unidad + ')' : '' }}</span></label
              >
              <input
                id="aj-cantidad"
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
          </div>

          @if (form.controls.tipo.value === 'ENTRADA') {
            <div>
              <label class="label" for="aj-costo"><span class="label-text">Costo unitario</span></label>
              <input
                id="aj-costo"
                type="number"
                step="0.0001"
                min="0"
                inputmode="decimal"
                formControlName="costoInicial"
                class="input input-bordered w-full sm:max-w-48"
                [class.input-error]="!!errorFor('costoInicial')"
              />
              @if (errorFor('costoInicial'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              }
            </div>
          } @else {
            <p class="text-xs text-base-content/55">Las salidas usan el costo promedio vigente.</p>
          }

          <div>
            <label class="label" for="aj-motivo"><span class="label-text">Motivo</span></label>
            <input
              id="aj-motivo"
              type="text"
              list="aj-motivos"
              placeholder="Ej. Conteo físico, merma por humedad"
              formControlName="motivo"
              class="input input-bordered w-full"
              [class.input-error]="!!errorFor('motivo')"
            />
            <datalist id="aj-motivos">
              <option value="Ajuste por conteo físico"></option>
              <option value="Merma"></option>
              <option value="Producto dañado o vencido"></option>
              <option value="Consumo no registrado"></option>
            </datalist>
            @if (errorFor('motivo'); as message) {
              <p class="mt-1 text-xs text-error">{{ message }}</p>
            }
          </div>

          @if (kind() === 'materia-prima') {
            <div>
              <label class="label" for="aj-documento"
                ><span class="label-text"
                  >N.º de documento{{ form.controls.tipo.value === 'ENTRADA' ? '' : ' (opcional)' }}</span
                ></label
              >
              <input
                id="aj-documento"
                type="text"
                [maxLength]="documentoMax"
                placeholder="Ej. FAC-0042"
                formControlName="documento"
                class="input input-bordered w-full"
                [class.input-error]="!!errorFor('documento')"
              />
              @if (errorFor('documento'); as message) {
                <p class="mt-1 text-xs text-error">{{ message }}</p>
              } @else if (form.controls.tipo.value === 'ENTRADA') {
                <p class="mt-1 text-xs text-base-content/50">Factura, remisión o guía de la entrada.</p>
              }
            </div>
          }
        </fieldset>

        @if (after(); as result) {
          <p class="rounded-box bg-base-200 px-4 py-3 text-sm" aria-live="polite">
            Existencia:
            <span class="tabular-nums">{{ result.antes | number: '1.0-3' }}</span>
            <span aria-hidden="true"> → </span>
            <b class="tabular-nums">{{ result.despues | number: '1.0-3' }} {{ result.unidad }}</b>
          </p>
        }
      </form>

      <div footer class="contents">
        <button type="button" class="btn btn-ghost" (click)="closed.emit()">Cancelar</button>
        <button
          type="submit"
          form="adjustment-form"
          class="btn btn-primary"
          [disabled]="saving() || !item() || item()!.inventarioId === null"
        >
          @if (saving()) {
            <span class="loading loading-spinner loading-sm"></span>
          }
          Guardar movimiento
        </button>
      </div>
    </app-form-drawer>
  `,
})
export class AdjustmentDrawer {
  private readonly service = inject(InventoryService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  readonly title = input('Ajuste de inventario');
  /** Insumo fijo (ficha). Sin él, el usuario elige tipo de artículo y artículo. */
  readonly materialId = input<Id | null>(null);
  readonly closed = output<void>();
  readonly saved = output<void>();

  protected readonly documentoMax = DOCUMENTO_MAX_LENGTH;
  protected readonly saving = signal(false);
  protected readonly opening = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly kind = signal<StockKind>('materia-prima');
  private readonly selectedId = signal(0);

  private readonly kindControl = this.fb.control<StockKind>('materia-prima');
  private readonly tipoControl = this.fb.control<MovementType>('SALIDA', Validators.required);

  protected readonly form = this.fb.group({
    kind: this.kindControl,
    itemId: [0, [Validators.min(1)]],
    tipo: this.tipoControl,
    clase: ['AJUSTE' as 'AJUSTE' | 'MERMA'],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    costoInicial: [0, [Validators.required, Validators.min(0)]],
    motivo: ['', [Validators.required, Validators.minLength(3)]],
    documento: [
      '',
      [
        // El backend solo guarda documento en materia prima.
        documentoObligatorio(() =>
          this.kindControl.value === 'materia-prima' ? this.tipoControl.value : null,
        ),
        Validators.maxLength(DOCUMENTO_MAX_LENGTH),
      ],
    ],
  });
  private readonly values = toSignal(this.form.valueChanges, {
    initialValue: this.form.getRawValue(),
  });

  private readonly materials = httpResource<RawMaterial[]>(
    () => (this.open() ? this.service.materialsUrl() : undefined),
    { defaultValue: [] },
  );
  private readonly materialStock = httpResource<RawMaterialStock[]>(
    () => (this.open() ? this.service.stockUrl('materia-prima') : undefined),
    { defaultValue: [] },
  );
  private readonly products = httpResource<CatalogProduct[]>(
    () => (this.open() && this.kind() === 'producto' ? this.service.productsUrl() : undefined),
    { defaultValue: [] },
  );
  private readonly productStock = httpResource<ProductStock[]>(
    () => (this.open() && this.kind() === 'producto' ? this.service.stockUrl('producto') : undefined),
    { defaultValue: [] },
  );

  protected readonly options = computed<ItemOption[]>(() => {
    if (this.kind() === 'materia-prima') {
      const fixed = this.materialId();
      const stock = new Map(valueOr(this.materialStock, []).map((s) => [s.materiaPrimaId, s]));
      return valueOr(this.materials, [])
        .filter((material) => material.activo !== false || material.id === fixed)
        .map((material) => ({
          id: material.id,
          nombre: material.nombre,
          unidad: material.unidadMedida,
          cantidad: Number(stock.get(material.id)?.cantidad ?? 0),
          inventarioId: stock.get(material.id)?.id ?? null,
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));
    }
    const stock = new Map(valueOr(this.productStock, []).map((s) => [s.productoId, s]));
    return valueOr(this.products, [])
      .filter((product) => product.activo)
      .map((product) => ({
        id: product.id,
        nombre: product.nombre,
        unidad: 'unidades',
        cantidad: Number(stock.get(product.id)?.cantidad ?? 0),
        inventarioId: stock.get(product.id)?.id ?? null,
      }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  });
  protected readonly item = computed(
    () => this.options().find((option) => option.id === this.selectedId()) ?? null,
  );

  protected readonly after = computed(() => {
    const item = this.item();
    const cantidad = Number(this.values().cantidad) || 0;
    if (!item || item.inventarioId === null || cantidad <= 0) return null;
    const signo = this.values().tipo === 'ENTRADA' ? 1 : -1;
    return {
      antes: item.cantidad,
      despues: Math.round((item.cantidad + signo * cantidad) * 1000) / 1000,
      unidad: item.unidad,
    };
  });

  constructor() {
    this.form.controls.kind.valueChanges.pipe(takeUntilDestroyed()).subscribe((kind) => {
      this.kind.set(kind);
      this.form.controls.itemId.setValue(0);
      this.form.controls.documento.updateValueAndValidity();
    });
    this.form.controls.itemId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => this.selectedId.set(Number(id)));
    // La merma siempre es salida.
    this.form.controls.clase.valueChanges.pipe(takeUntilDestroyed()).subscribe((clase) => {
      if (clase === 'MERMA') this.form.controls.tipo.setValue('SALIDA');
    });
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      if (tipo === 'ENTRADA') {
        this.form.controls.costoInicial.enable();
      } else {
        this.form.controls.costoInicial.disable();
      }
      this.form.controls.documento.updateValueAndValidity();
    });

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
      if (field === 'itemId') return 'Elegí un artículo.';
      return field === 'cantidad'
        ? 'Ingresá una cantidad mayor que cero.'
        : 'No puede ser negativo.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected openStock(): void {
    const item = this.item();
    if (!item) return;
    this.opening.set(true);
    this.service.openStock(this.kind(), item.id).subscribe({
      next: () => {
        this.opening.set(false);
        this.notifications.success(`Inventario de "${item.nombre}" habilitado.`);
        if (this.kind() === 'materia-prima') {
          this.materialStock.reload();
        } else {
          this.productStock.reload();
        }
      },
      error: () => this.opening.set(false),
    });
  }

  protected save(): void {
    const item = this.item();
    if (!item || item.inventarioId === null) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.tipo === 'SALIDA' && value.cantidad > item.cantidad) {
      this.form.controls.cantidad.setErrors({
        server: 'No hay suficiente existencia para esta salida.',
      });
      this.form.controls.cantidad.markAsTouched();
      return;
    }

    const documento = value.documento.trim();
    this.saving.set(true);
    this.formError.set(null);
    this.service
      .registerMovement(value.kind, {
        inventarioId: item.inventarioId,
        tipo: value.tipo,
        cantidad: Number(value.cantidad),
        motivo: value.motivo.trim(),
        ...(value.kind === 'materia-prima' && documento ? { documento } : {}),
        ...(value.kind === 'materia-prima' ? { clase: value.clase } : {}),
        ...(value.tipo === 'ENTRADA' ? { costoInicial: Number(value.costoInicial) } : {}),
      })
      .subscribe({
        next: () => {
          this.saving.set(false);
          this.notifications.success(
            `${value.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para "${item.nombre}".`,
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
    this.kind.set('materia-prima');
    this.form.reset({
      kind: 'materia-prima',
      itemId: fixed ?? 0,
      tipo: 'SALIDA',
      clase: 'AJUSTE',
      cantidad: 0,
      costoInicial: 0,
      motivo: '',
      documento: '',
    });
    this.form.controls.costoInicial.disable({ emitEvent: false });
    this.selectedId.set(fixed ?? 0);
    if (fixed !== null) {
      this.form.controls.itemId.disable({ emitEvent: false });
    } else {
      this.form.controls.itemId.enable({ emitEvent: false });
    }
  }
}
