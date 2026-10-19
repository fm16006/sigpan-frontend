import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage, formLevelMessage } from '../../../../core/http/form-errors';
import { Id } from '../../../../core/models/api.model';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import {
  Formula,
  FormulaDraft,
  FormulaLine,
  FormulaLineDraft,
  RawMaterial,
} from '../../../../core/models/production.model';
import { Notifications } from '../../../../core/services/notifications';
import { ConfirmDialog } from '../../../../shared/ui/confirm-dialog/confirm-dialog';
import { FormDrawer } from '../../../../shared/ui/form-drawer/form-drawer';
import { Icon } from '../../../../shared/ui/icon/icon';
import { RecipeService } from '../../services/recipe.service';

/**
 * Drawer de receta: datos de la receta y, una vez guardada, el editor de sus insumos.
 * Al crear una receta el drawer sigue abierto para que se agreguen los insumos enseguida.
 */
@Component({
  selector: 'app-recipe-drawer',
  imports: [ReactiveFormsModule, DecimalPipe, FormDrawer, ConfirmDialog, Icon],
  templateUrl: './recipe-drawer.html',
})
export class RecipeDrawer {
  private readonly service = inject(RecipeService);
  private readonly notifications = inject(Notifications);
  private readonly fb = inject(FormBuilder).nonNullable;

  readonly open = input(false);
  /** Receta a editar; null = alta. */
  readonly formula = input<Formula | null>(null);
  /** Producto con el que arranca el alta (por ejemplo, desde la ficha del producto). */
  readonly presetProductId = input<number | null>(null);
  readonly products = input<readonly CatalogProduct[]>([]);
  readonly materials = input<readonly RawMaterial[]>([]);

  readonly closed = output<void>();
  /** Cambió algo en el backend: la lista debe recargarse. */
  readonly changed = output<void>();

  /** Receta que el drawer tiene abierta; tras crear una receta nueva pasa a ser esta. */
  protected readonly current = signal<Formula | null>(null);
  protected readonly savingFormula = signal(false);
  protected readonly formulaError = signal<string | null>(null);

  protected readonly formulaForm = this.fb.group({
    productoId: [0, [Validators.required, Validators.min(1)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    // El backend la exige (@NotBlank en FormulaRequest).
    descripcion: ['', [Validators.required]],
    cantidadProduccion: [1, [Validators.required, Validators.min(0.01)]],
    // Merma de proceso en porcentaje. Si no se llena, el backend guarda 0.
    porcentajeMerma: [0, [Validators.min(0), Validators.max(100)]],
  });

  protected readonly lines = httpResource<FormulaLine[]>(
    () => {
      const formula = this.current();
      return formula ? this.service.linesUrl(formula.id) : undefined;
    },
    { defaultValue: [] },
  );
  // value() lanza si el recurso está en error: se lee solo cuando hay valor.
  protected readonly lineItems = computed(() => (this.lines.hasValue() ? this.lines.value() : []));

  protected readonly editingLineId = signal<Id | null>(null);
  protected readonly lineFormOpen = signal(false);
  protected readonly savingLine = signal(false);
  protected readonly lineError = signal<string | null>(null);
  protected readonly removeTarget = signal<FormulaLine | null>(null);
  protected readonly removing = signal(false);

  protected readonly lineForm = this.fb.group({
    materiaPrimaId: [0, [Validators.required, Validators.min(1)]],
    cantidad: [0, [Validators.required, Validators.min(0.001)]],
    unidadMedida: ['', [Validators.required, Validators.maxLength(30)]],
  });

  protected readonly isEdit = computed(() => this.current() !== null);

  constructor() {
    // Al elegir el insumo, la unidad se prellena con la unidad base del insumo.
    this.lineForm.controls.materiaPrimaId.valueChanges.pipe(takeUntilDestroyed()).subscribe((id) => {
      const material = this.materials().find((item) => item.id === Number(id));
      if (material) {
        this.lineForm.controls.unidadMedida.setValue(material.unidadMedida);
      }
    });

    // Cada apertura arranca con la receta recibida (o en blanco).
    effect(() => {
      if (!this.open()) {
        return;
      }
      const formula = this.formula();
      const preset = this.presetProductId();
      untracked(() => {
        this.current.set(formula);
        this.formulaError.set(null);
        this.closeLineForm();
        this.formulaForm.reset({
          productoId: formula?.productoId ?? preset ?? 0,
          nombre: formula?.nombre ?? '',
          descripcion: formula?.descripcion ?? '',
          cantidadProduccion: Number(formula?.cantidadProduccion ?? 1),
          porcentajeMerma: Number(formula?.porcentajeMerma ?? 0),
        });
      });
    });
  }

  protected errorFor(form: 'formula' | 'line', field: string): string | null {
    const group: FormGroup = form === 'formula' ? this.formulaForm : this.lineForm;
    const control = group.get(field);
    if (field === 'porcentajeMerma' && (control?.hasError('min') || control?.hasError('max')) && control.touched) {
      return 'Debe estar entre 0 y 100.';
    }
    if (control?.hasError('min') && control.touched) {
      if (field === 'productoId') return 'Elegí un producto.';
      if (field === 'materiaPrimaId') return 'Elegí un insumo.';
      return 'Debe ser mayor que cero.';
    }
    return firstErrorMessage(group, field);
  }

  // ----- Receta -----

  protected saveFormula(): void {
    this.formulaError.set(null);
    if (this.formulaForm.invalid) {
      this.formulaForm.markAllAsTouched();
      return;
    }

    this.savingFormula.set(true);
    const value = this.formulaForm.getRawValue();
    const draft: FormulaDraft = {
      nombre: value.nombre.trim(),
      descripcion: value.descripcion.trim(),
      cantidadProduccion: Number(value.cantidadProduccion),
      porcentajeMerma: Number(value.porcentajeMerma ?? 0),
      productoId: Number(value.productoId),
    };
    const existing = this.current();
    const request = existing
      ? this.service.updateFormula(existing.id, draft)
      : this.service.createFormula(draft);

    request.subscribe({
      next: (formula) => {
        this.savingFormula.set(false);
        this.changed.emit();
        if (existing) {
          this.notifications.success(`Receta "${formula.nombre}" actualizada.`);
          this.closed.emit();
        } else {
          // Se queda abierto en modo edición para cargar los insumos de la receta nueva.
          this.current.set(formula);
          this.notifications.success(`Receta "${formula.nombre}" creada. Agregá sus insumos.`);
        }
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

  protected saveLine(): void {
    const formula = this.current();
    if (!formula) return;
    if (this.lineForm.invalid) {
      this.lineForm.markAllAsTouched();
      return;
    }

    this.savingLine.set(true);
    this.lineError.set(null);
    const value = this.lineForm.getRawValue();
    const draft: FormulaLineDraft = {
      formulaId: formula.id,
      materiaPrimaId: Number(value.materiaPrimaId),
      cantidad: Number(value.cantidad),
      unidadMedida: value.unidadMedida.trim(),
    };
    const id = this.editingLineId();
    const request = id === null ? this.service.createLine(draft) : this.service.updateLine(id, draft);

    request.subscribe({
      next: () => {
        this.savingLine.set(false);
        this.closeLineForm();
        this.notifications.success(id === null ? 'Insumo agregado a la receta.' : 'Insumo actualizado.');
        this.lines.reload();
        this.changed.emit();
      },
      error: (error: AppError) => {
        this.savingLine.set(false);
        applyFieldErrors(this.lineForm, error);
        this.lineError.set(formLevelMessage(error));
      },
    });
  }

  protected confirmRemoveLine(): void {
    const line = this.removeTarget();
    if (!line) return;

    this.removing.set(true);
    this.service.removeLine(line.id).subscribe({
      next: () => {
        this.removing.set(false);
        this.removeTarget.set(null);
        this.notifications.success(`"${line.materiaPrima}" quitado de la receta.`);
        this.lines.reload();
        this.changed.emit();
      },
      error: () => {
        this.removing.set(false);
        this.removeTarget.set(null);
      },
    });
  }
}
