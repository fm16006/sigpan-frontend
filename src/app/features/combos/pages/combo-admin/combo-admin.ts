import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { ApiClient } from '../../../../core/http/api-client';
import { AppError, toAppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Combo, ComboDraft, ComboLine } from '../../../../core/models/combo.model';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { ComboService } from '../../services/combo.service';

/**
 * Combos: precio conjunto de varios productos. El backend exige que el precio sea menor que la
 * suma de los productos; ese mensaje llega tal cual y se muestra en el formulario.
 */
@Component({
  selector: 'app-combo-admin',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, MoneyPipe],
  templateUrl: './combo-admin.html',
})
export class ComboAdmin {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(ApiClient);
  private readonly combos = inject(ComboService);
  private readonly notifications = inject(Notifications);

  protected readonly list = httpResource<Combo[]>(() => this.api.url(API_ENDPOINTS.combos.root), {
    defaultValue: [],
  });
  protected readonly products = httpResource<CatalogProduct[]>(
    () => this.api.url(API_ENDPOINTS.productos.root),
    { defaultValue: [] },
  );
  protected readonly lines = httpResource<ComboLine[]>(() => {
    const combo = this.selected();
    return combo ? this.api.url(API_ENDPOINTS.combosDetalles.byCombo(combo.id)) : undefined;
  }, { defaultValue: [] });

  /** Combo abierto para editar sus productos. null = alta de combo nuevo. */
  protected readonly selected = signal<Combo | null>(null);
  protected readonly editingCombo = signal(false);
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly lineError = signal<string | null>(null);

  protected readonly comboForm = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
  });

  protected readonly lineForm = this.fb.nonNullable.group({
    productoId: [0, [Validators.min(1)]],
    cantidad: [1, [Validators.required, Validators.min(1)]],
  });

  protected select(combo: Combo): void {
    this.selected.set(combo);
    this.editingCombo.set(false);
    this.lineError.set(null);
    this.comboForm.reset({ nombre: '', descripcion: '', precio: 0 });
  }

  protected startCreate(): void {
    this.selected.set(null);
    this.editingCombo.set(true);
    this.formError.set(null);
    this.comboForm.reset({ nombre: '', descripcion: '', precio: 0 });
  }

  protected startEdit(combo: Combo): void {
    this.selected.set(combo);
    this.editingCombo.set(true);
    this.formError.set(null);
    this.comboForm.reset({
      nombre: combo.nombre,
      descripcion: combo.descripcion ?? '',
      precio: combo.precio,
    });
  }

  protected fieldError(field: 'nombre' | 'descripcion' | 'precio'): string | null {
    return firstErrorMessage(this.comboForm, field);
  }

  protected saveCombo(): void {
    this.formError.set(null);
    if (this.comboForm.invalid) {
      this.comboForm.markAllAsTouched();
      return;
    }

    const raw = this.comboForm.getRawValue();
    const draft: ComboDraft = {
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() || null,
      precio: Number(raw.precio),
    };
    const current = this.selected();

    this.saving.set(true);
    const request = this.editingCombo() && current
      ? this.combos.update(current.id, draft)
      : this.combos.create(draft);

    request.subscribe({
      next: (combo) => {
        this.saving.set(false);
        this.notifications.success(current ? 'Combo actualizado.' : 'Combo creado.');
        this.list.reload();
        this.select(combo);
      },
      error: (error: unknown) => {
        this.saving.set(false);
        this.showError(error, this.comboForm, this.formError);
      },
    });
  }

  protected addLine(): void {
    const combo = this.selected();
    this.lineError.set(null);
    if (!combo) return;
    if (this.lineForm.invalid || this.lineForm.controls.productoId.value < 1) {
      this.lineForm.markAllAsTouched();
      this.lineError.set('Seleccioná un producto y una cantidad.');
      return;
    }

    const raw = this.lineForm.getRawValue();
    this.combos
      .addLine({ comboId: combo.id, productoId: Number(raw.productoId), cantidad: Number(raw.cantidad) })
      .subscribe({
        next: () => {
          this.lines.reload();
          this.lineForm.reset({ productoId: 0, cantidad: 1 });
          this.notifications.success('Producto agregado al combo.');
        },
        error: (error: unknown) => {
          // Si el precio deja de ser menor que la suma, el backend revierte la línea y explica por qué.
          this.lineError.set(toAppError(error as HttpErrorResponse).message);
        },
      });
  }

  protected removeLine(line: ComboLine): void {
    this.combos.removeLine(line.id).subscribe({
      next: () => {
        this.lines.reload();
        this.notifications.success('Producto quitado del combo.');
      },
      error: (error: unknown) => {
        this.lineError.set(toAppError(error as HttpErrorResponse).message);
      },
    });
  }

  private showError(
    error: unknown,
    form: FormGroup,
    target: { set(value: string | null): void },
  ): void {
    const appError: AppError = toAppError(error as HttpErrorResponse);
    applyFieldErrors(form, appError);
    target.set(formLevelMessage(appError));
  }
}
