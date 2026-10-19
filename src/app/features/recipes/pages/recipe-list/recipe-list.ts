import { Component, inject, signal } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import {
  applyFieldErrors,
  firstErrorMessage,
  formLevelMessage,
} from '../../../../core/http/form-errors';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import {
  Formula,
  FormulaCost,
  FormulaDraft,
  FormulaLine,
  FormulaLineDraft,
  RawMaterial,
} from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { Notifications } from '../../../../core/services/notifications';
import { MoneyPipe } from '../../../../shared/pipes/money.pipe';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { RecipeService } from '../../services/recipe.service';

@Component({
  selector: 'app-recipe-list',
  imports: [ReactiveFormsModule, PageHeader, ResourceState, DecimalPipe, MoneyPipe],
  templateUrl: './recipe-list.html',
})
export class RecipeList {
  private readonly service = inject(RecipeService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;
  private readonly auth = inject(Auth);

  /** Quien administra recetas también ve el costo. */
  protected readonly canManage = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);

  protected readonly openId = signal<Id | null>(null);
  protected readonly costId = signal<Id | null>(null);

  protected readonly formulas = httpResource<Formula[]>(() => this.service.formulasUrl(), {
    defaultValue: [],
  });
  protected readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  protected readonly materials = httpResource<RawMaterial[]>(() => this.service.materialsUrl(), {
    defaultValue: [],
  });

  protected readonly lines = httpResource<FormulaLine[]>(
    () => {
      const id = this.openId();
      return id === null ? undefined : this.service.linesUrl(id);
    },
    { defaultValue: [] },
  );

  protected readonly cost = httpResource<FormulaCost>(() => {
    const id = this.costId();
    return id === null || !this.canManage ? undefined : this.service.costUrl(id);
  });

  // Formulario de receta (alta y edición).
  protected readonly showFormulaForm = signal(false);
  protected readonly editingFormulaId = signal<Id | null>(null);
  protected readonly savingFormula = signal(false);
  protected readonly formulaError = signal<string | null>(null);
  protected readonly formulaForm = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    // El backend la exige (@NotBlank en FormulaRequest).
    descripcion: ['', [Validators.required]],
    cantidadProduccion: [1, [Validators.required, Validators.min(0.01)]],
  });

  // Insumos de la receta abierta (alta y edición).
  protected readonly lineFormOpen = signal(false);
  protected readonly editingLineId = signal<Id | null>(null);
  protected readonly savingLine = signal(false);
  protected readonly lineError = signal<string | null>(null);
  protected readonly busyLineId = signal<Id | null>(null);
  protected readonly confirmRemoveLineId = signal<Id | null>(null);
  protected readonly lineForm = this.fb.group({
    materiaPrimaId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    unidadMedida: ['', [Validators.required, Validators.maxLength(30)]],
  });

  constructor() {
    // Al elegir el insumo, la unidad se prellena con la unidad base del insumo.
    this.lineForm.controls.materiaPrimaId.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe((id) => {
        const material = this.materials.value().find((item) => item.id === Number(id));
        if (material) {
          this.lineForm.controls.unidadMedida.setValue(material.unidadMedida);
        }
      });
  }

  protected errorFor(form: 'formula' | 'line', field: string): string | null {
    const group: FormGroup = form === 'formula' ? this.formulaForm : this.lineForm;
    const control = group.get(field);
    if (control?.hasError('min') && control.touched) {
      if (field === 'productoId') return 'Elegí un producto.';
      if (field === 'materiaPrimaId') return 'Elegí un insumo.';
      return 'Debe ser mayor que cero.';
    }
    return firstErrorMessage(group, field);
  }

  protected toggle(id: Id): void {
    this.openId.update((current) => (current === id ? null : id));
    this.closeLineForm();
    this.confirmRemoveLineId.set(null);
  }

  protected toggleCost(id: Id): void {
    this.costId.update((current) => (current === id ? null : id));
  }

  /** El costo que se muestra corresponde a la receta pedida, no a una anterior. */
  protected costOf(id: Id): FormulaCost | null {
    const value = this.cost.value();
    return this.costId() === id && value?.formulaId === id ? value : null;
  }

  // ----- Recetas -----

  protected openNewFormula(): void {
    this.editingFormulaId.set(null);
    this.formulaError.set(null);
    this.formulaForm.reset();
    this.showFormulaForm.set(true);
  }

  protected openEditFormula(formula: Formula): void {
    this.editingFormulaId.set(formula.id);
    this.formulaError.set(null);
    this.formulaForm.setValue({
      productoId: formula.productoId,
      nombre: formula.nombre,
      descripcion: formula.descripcion ?? '',
      cantidadProduccion: Number(formula.cantidadProduccion),
    });
    this.showFormulaForm.set(true);
  }

  protected closeFormulaForm(): void {
    this.showFormulaForm.set(false);
    this.editingFormulaId.set(null);
    this.formulaError.set(null);
    this.formulaForm.reset();
  }

  protected saveFormula(): void {
    if (this.formulaForm.invalid) {
      this.formulaForm.markAllAsTouched();
      return;
    }

    this.savingFormula.set(true);
    this.formulaError.set(null);
    const value = this.formulaForm.getRawValue();
    const draft: FormulaDraft = {
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim(),
      cantidadProduccion: Number(value.cantidadProduccion),
      productoId: Number(value.productoId),
    };
    const id = this.editingFormulaId();
    const request =
      id === null ? this.service.createFormula(draft) : this.service.updateFormula(id, draft);

    request.subscribe({
      next: (formula) => {
        this.savingFormula.set(false);
        this.closeFormulaForm();
        this.notifications.success(
          `Receta "${formula.nombre}" ${id === null ? 'creada' : 'actualizada'}.`,
        );
        this.formulas.reload();
      },
      error: (error: AppError) => {
        this.savingFormula.set(false);
        applyFieldErrors(this.formulaForm, error);
        this.formulaError.set(formLevelMessage(error));
      },
    });
  }

  // ----- Insumos -----

  protected openNewLine(): void {
    this.editingLineId.set(null);
    this.lineError.set(null);
    this.lineForm.reset();
    this.lineFormOpen.set(true);
  }

  protected openEditLine(line: FormulaLine): void {
    this.editingLineId.set(line.id);
    this.lineError.set(null);
    this.lineForm.setValue({
      materiaPrimaId: line.materiaPrimaId,
      cantidad: Number(line.cantidad),
      // Va al final: el cambio de insumo prellena la unidad y aquí se conserva la de la línea.
      unidadMedida: line.unidadMedida,
    });
    this.lineFormOpen.set(true);
  }

  protected closeLineForm(): void {
    this.lineFormOpen.set(false);
    this.editingLineId.set(null);
    this.lineError.set(null);
    this.lineForm.reset();
  }

  protected saveLine(formulaId: Id): void {
    if (this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }

    this.savingLine.set(true);
    this.lineError.set(null);
    const value = this.lineForm.getRawValue();
    const draft: FormulaLineDraft = {
      formulaId,
      materiaPrimaId: Number(value.materiaPrimaId),
      cantidad: Number(value.cantidad),
      unidadMedida: value.unidadMedida.trim(),
    };
    const id = this.editingLineId();
    const request =
      id === null ? this.service.createLine(draft) : this.service.updateLine(id, draft);

    request.subscribe({
      next: () => {
        this.savingLine.set(false);
        this.closeLineForm();
        this.notifications.success(id === null ? 'Insumo agregado a la receta.' : 'Insumo actualizado.');
        this.lines.reload();
      },
      error: (error: AppError) => {
        this.savingLine.set(false);
        applyFieldErrors(this.lineForm, error);
        this.lineError.set(formLevelMessage(error));
      },
    });
  }

  protected removeLine(line: FormulaLine): void {
    if (this.confirmRemoveLineId() !== line.id) {
      this.confirmRemoveLineId.set(line.id);
      return;
    }

    this.confirmRemoveLineId.set(null);
    this.busyLineId.set(line.id);
    this.service.removeLine(line.id).subscribe({
      next: () => {
        this.busyLineId.set(null);
        this.notifications.success(`"${line.materiaPrima}" quitado de la receta.`);
        this.lines.reload();
      },
      error: () => this.busyLineId.set(null),
    });
  }
}
