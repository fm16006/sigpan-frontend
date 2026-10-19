import { Component, computed, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import {
  DOCUMENTO_MAX_LENGTH,
  MovementType,
  ProductStock,
  RawMaterialStock,
  StockKind,
  StockMovement,
  StockRow,
  isLowStock,
} from '../../../../core/models/inventory.model';
import { RawMaterial } from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { InventoryService } from '../../services/inventory.service';
import { documentoObligatorio } from './movement-document';

@Component({
  selector: 'app-inventory-list',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, DatePipe, DecimalPipe, MoneyPipe],
  templateUrl: './inventory-list.html',
})
export class InventoryList {
  private readonly service = inject(InventoryService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  protected readonly canMove = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'BODEGUERO']);

  protected readonly kind = signal<StockKind>('materia-prima');
  protected readonly onlyLow = signal(false);
  protected readonly movingRow = signal<StockRow | null>(null);
  protected readonly historyRow = signal<StockRow | null>(null);
  protected readonly saving = signal(false);
  protected readonly openingId = signal<number | null>(null);
  protected readonly isLow = isLowStock;

  protected readonly materials = httpResource<RawMaterial[]>(() => this.service.materialsUrl(), {
    defaultValue: [],
  });
  protected readonly materialStock = httpResource<RawMaterialStock[]>(
    () => this.service.stockUrl('materia-prima'),
    { defaultValue: [] },
  );
  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  protected readonly productStock = httpResource<ProductStock[]>(
    () => this.service.stockUrl('producto'),
    { defaultValue: [] },
  );
  protected readonly movements = httpResource<StockMovement[]>(
    () => {
      const row = this.historyRow();
      return row ? this.service.movementsUrl(row.kind, row.itemId) : undefined;
    },
    { defaultValue: [] },
  );

  protected readonly history = computed(() =>
    [...this.movements.value()].sort((a, b) => b.fecha.localeCompare(a.fecha) || b.id - a.id),
  );

  private readonly materialRows = computed<StockRow[]>(() => {
    const stock = new Map(this.materialStock.value().map((item) => [item.materiaPrimaId, item]));
    return this.materials.value().map((material) => {
      const entry = stock.get(material.id);
      return {
        kind: 'materia-prima',
        itemId: material.id,
        inventarioId: entry?.id ?? null,
        nombre: material.nombre,
        descripcion: material.descripcion,
        unidad: material.unidadMedida,
        cantidad: Number(entry?.cantidad ?? 0),
        minimo: Number(material.stockMinimo ?? 0),
        fechaActualizacion: entry?.fechaActualizacion ?? null,
      };
    });
  });

  private readonly productRows = computed<StockRow[]>(() => {
    const stock = new Map(this.productStock.value().map((item) => [item.productoId, item]));
    return this.products.value().map((product) => {
      const entry = stock.get(product.id);
      return {
        kind: 'producto',
        itemId: product.id,
        inventarioId: entry?.id ?? null,
        nombre: product.nombre,
        descripcion: product.categoria,
        unidad: 'unidades',
        cantidad: Number(entry?.cantidad ?? 0),
        minimo: Number(product.stockMinimo ?? 0),
        fechaActualizacion: entry?.fechaActualizacion ?? null,
      };
    });
  });

  protected readonly rows = computed(() =>
    (this.kind() === 'materia-prima' ? this.materialRows() : this.productRows())
      .filter((row) => !this.onlyLow() || isLowStock(row))
      .sort((a, b) => a.nombre.localeCompare(b.nombre)),
  );

  protected readonly lowMaterials = computed(() => this.materialRows().filter(isLowStock).length);
  protected readonly lowProducts = computed(() => this.productRows().filter(isLowStock).length);

  protected readonly loading = computed(() =>
    this.kind() === 'materia-prima'
      ? this.materials.isLoading() || this.materialStock.isLoading()
      : this.products.isLoading() || this.productStock.isLoading(),
  );
  protected readonly failed = computed(() =>
    this.kind() === 'materia-prima'
      ? !!this.materials.error() || !!this.materialStock.error()
      : !!this.products.error() || !!this.productStock.error(),
  );

  /** Error general del backend (400/409 sin campo), para mostrar arriba del formulario. */
  protected readonly formError = signal<string | null>(null);

  private readonly tipo = this.fb.control<MovementType>('ENTRADA', Validators.required);

  protected readonly form = this.fb.group({
    tipo: this.tipo,
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    costoInicial: [0, [Validators.required, Validators.min(0)]],
    motivo: ['', [Validators.required, Validators.minLength(3)]],
    documento: [
      '',
      [documentoObligatorio(() => this.tipo.value), Validators.maxLength(DOCUMENTO_MAX_LENGTH)],
    ],
  });

  constructor() {
    this.form.controls.tipo.valueChanges.pipe(takeUntilDestroyed()).subscribe((tipo) => {
      if (tipo === 'ENTRADA') {
        this.form.controls.costoInicial.enable();
      } else {
        this.form.controls.costoInicial.disable();
      }
      this.form.controls.documento.updateValueAndValidity();
    });
  }

  protected errorFor(field: string): string | null {
    const control = this.form.get(field);
    if (control?.hasError('min') && control.touched) {
      return field === 'cantidad'
        ? 'Ingresá una cantidad mayor que cero.'
        : 'No puede ser negativo.';
    }
    return firstErrorMessage(this.form, field);
  }

  protected selectKind(kind: StockKind): void {
    this.kind.set(kind);
    this.closeMovement();
    this.historyRow.set(null);
  }

  protected reload(): void {
    this.materials.reload();
    this.materialStock.reload();
    this.products.reload();
    this.productStock.reload();
    this.movements.reload();
  }

  protected startMovement(row: StockRow): void {
    this.form.reset();
    this.formError.set(null);
    this.movingRow.set(row);
  }

  protected closeMovement(): void {
    this.movingRow.set(null);
    this.formError.set(null);
    this.form.reset();
  }

  protected toggleHistory(row: StockRow): void {
    const current = this.historyRow();
    this.historyRow.set(current?.kind === row.kind && current.itemId === row.itemId ? null : row);
  }

  protected isHistoryOpen(row: StockRow): boolean {
    const current = this.historyRow();
    return current?.kind === row.kind && current.itemId === row.itemId;
  }

  protected openStock(row: StockRow): void {
    this.openingId.set(row.itemId);
    this.service.openStock(row.kind, row.itemId).subscribe({
      next: () => {
        this.openingId.set(null);
        this.notifications.success(`Inventario de "${row.nombre}" habilitado.`);
        this.reloadStock(row.kind);
      },
      error: () => this.openingId.set(null),
    });
  }

  protected saveMovement(): void {
    const row = this.movingRow();
    if (!row || row.inventarioId === null) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const value = this.form.getRawValue();
    if (value.tipo === 'SALIDA' && value.cantidad > row.cantidad) {
      this.form.controls.cantidad.setErrors({
        server: 'No hay suficiente existencia para esta salida.',
      });
      this.form.controls.cantidad.markAsTouched();
      return;
    }

    this.saving.set(true);
    this.formError.set(null);
    const documento = value.documento.trim();
    this.service
      .registerMovement(row.kind, {
        inventarioId: row.inventarioId,
        tipo: value.tipo,
        cantidad: value.cantidad,
        motivo: value.motivo.trim(),
        ...(documento ? { documento } : {}),
        ...(value.tipo === 'ENTRADA' ? { costoInicial: value.costoInicial } : {}),
      })
      .subscribe({
        next: (movement) => {
          this.saving.set(false);
          this.closeMovement();
          this.notifications.success(
            `${movement.tipo === 'ENTRADA' ? 'Entrada' : 'Salida'} registrada para "${row.nombre}".`,
          );
          this.reloadStock(row.kind);
          if (this.isHistoryOpen(row)) {
            this.movements.reload();
          }
        },
        error: (error: AppError) => {
          this.saving.set(false);
          applyFieldErrors(this.form, error);
          this.formError.set(formLevelMessage(error));
        },
      });
  }

  private reloadStock(kind: StockKind): void {
    if (kind === 'materia-prima') {
      this.materialStock.reload();
    } else {
      this.productStock.reload();
    }
  }
}
