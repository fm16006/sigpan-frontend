import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Formula, FormulaLine, RawMaterial } from '../../../../core/models/production.model';
import { Auth } from '../../../../core/services/auth';
import { Icon } from '../../../../shared/ui/icon/icon';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { RecipeDrawer } from '../../components/recipe-drawer/recipe-drawer';
import { RecipeUnitCost } from '../../components/recipe-unit-cost/recipe-unit-cost';
import { RecipeService } from '../../services/recipe.service';
import { countByFormula, matchesRecipeSearch } from '../../recipe-summary';

@Component({
  selector: 'app-recipe-list',
  imports: [
    RouterLink,
    DecimalPipe,
    PageHeader,
    ResourceState,
    Icon,
    RecipeDrawer,
    RecipeUnitCost,
  ],
  templateUrl: './recipe-list.html',
})
export class RecipeList {
  private readonly service = inject(RecipeService);
  private readonly auth = inject(Auth);

  /**
   * Query params opcionales (se enlazan solos), pensados para la pestaña Receta del producto:
   * `?editar=<recetaId>` abre la receta para editarla; `?nueva=1&productoId=<id>` abre el alta.
   */
  readonly editar = input<string>();
  readonly nueva = input<string>();
  readonly productoId = input<string>();

  /** Quien administra recetas también ve el costo. */
  protected readonly canManage = this.auth.hasAnyRole(['ADMINISTRADOR', 'JEFE_PRODUCCION']);

  protected readonly crumbs = [{ label: 'Producción' }, { label: 'Recetas' }];

  protected readonly formulas = httpResource<Formula[]>(() => this.service.formulasUrl(), {
    defaultValue: [],
  });
  private readonly products = httpResource<CatalogProduct[]>(() => this.service.productsUrl(), {
    defaultValue: [],
  });
  private readonly materials = httpResource<RawMaterial[]>(() => this.service.materialsUrl(), {
    defaultValue: [],
  });
  private readonly lines = httpResource<FormulaLine[]>(() => this.service.allLinesUrl(), {
    defaultValue: [],
  });

  // value() lanza si el recurso está en error: se lee solo cuando hay valor.
  protected readonly formulaItems = computed(() =>
    this.formulas.hasValue() ? this.formulas.value() : [],
  );
  protected readonly productItems = computed(() =>
    this.products.hasValue() ? this.products.value() : [],
  );
  protected readonly materialItems = computed(() =>
    this.materials.hasValue() ? this.materials.value() : [],
  );
  private readonly lineCounts = computed(() =>
    countByFormula(this.lines.hasValue() ? this.lines.value() : []),
  );

  protected readonly search = signal('');
  protected readonly drawerOpen = signal(false);
  protected readonly editing = signal<Formula | null>(null);
  protected readonly presetProductId = signal<number | null>(null);

  protected readonly visible = computed(() => {
    const term = this.search();
    const counts = this.lineCounts();
    return this.formulaItems()
      .filter((formula) => matchesRecipeSearch(formula, term))
      .map((formula) => ({ formula, inputs: counts.get(formula.id) ?? 0 }));
  });

  /** Receta que ya se abrió desde la URL, para no reabrirla cada vez que se recarga la lista. */
  private handledEdit: string | undefined;

  constructor() {
    effect(() => {
      const editar = this.editar();
      const formulas = this.formulaItems();
      if (!editar || editar === this.handledEdit) {
        return;
      }
      const formula = formulas.find((item) => item.id === Number(editar));
      if (formula) {
        this.handledEdit = editar;
        untracked(() => this.openEdit(formula));
      }
    });

    effect(() => {
      if (this.nueva() === undefined) {
        return;
      }
      const productoId = Number(this.productoId());
      untracked(() => {
        this.editing.set(null);
        this.presetProductId.set(productoId > 0 ? productoId : null);
        this.drawerOpen.set(true);
      });
    });
  }

  protected openNew(): void {
    this.editing.set(null);
    this.presetProductId.set(null);
    this.drawerOpen.set(true);
  }

  protected openEdit(formula: Formula): void {
    this.editing.set(formula);
    this.presetProductId.set(null);
    this.drawerOpen.set(true);
  }

  protected reloadAll(): void {
    this.formulas.reload();
    this.lines.reload();
  }
}
