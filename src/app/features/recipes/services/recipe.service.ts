import { Injectable } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { CrudClient } from '../../../core/http/crud-client';
import { Recipe, RecipeDraft } from '../../../core/models/recipe.model';

@Injectable({ providedIn: 'root' })
export class RecipeService extends CrudClient<Recipe, RecipeDraft> {
  constructor() {
    super(API_ENDPOINTS.recipes);
  }
}
