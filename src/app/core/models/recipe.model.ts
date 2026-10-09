import { Id } from './api.model';
import { StockUnit } from './inventory.model';

export interface RecipeIngredient {
  readonly inventoryItemId: Id;
  readonly name: string;
  readonly quantity: number;
  readonly unit: StockUnit;
}

export interface Recipe {
  readonly id: Id;
  readonly name: string;
  readonly productId: Id | null;
  /** Unidades que rinde una tanda. */
  readonly yieldQuantity: number;
  readonly preparationMinutes: number;
  readonly ingredients: readonly RecipeIngredient[];
}

export type RecipeDraft = Omit<Recipe, 'id'>;
