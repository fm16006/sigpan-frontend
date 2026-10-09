import { Component, computed, inject } from '@angular/core';
import { httpResource } from '@angular/common/http';
import { EMPTY_PAGE, Page } from '../../../../core/models/api.model';
import { Recipe } from '../../../../core/models/recipe.model';
import { PageHeader } from '../../../../shared/ui/page-header/page-header';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { RecipeService } from '../../services/recipe.service';

@Component({
  selector: 'app-recipe-list',
  imports: [PageHeader, ResourceState],
  templateUrl: './recipe-list.html',
})
export class RecipeList {
  private readonly recipes = inject(RecipeService);

  protected readonly list = httpResource<Page<Recipe>>(
    () => this.recipes.listUrl({ size: 50, sort: 'name' }),
    { defaultValue: EMPTY_PAGE },
  );

  protected readonly items = computed(() => this.list.value().content);
}
