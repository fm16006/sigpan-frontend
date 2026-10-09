import { Id } from './api.model';

export const STOCK_UNITS = ['KG', 'G', 'L', 'ML', 'UNIDAD'] as const;

export type StockUnit = (typeof STOCK_UNITS)[number];

export interface InventoryItem {
  readonly id: Id;
  readonly name: string;
  readonly unit: StockUnit;
  readonly quantity: number;
  /** Por debajo de esto hay que reponer. */
  readonly reorderLevel: number;
  readonly updatedAt: string;
}

export type InventoryItemDraft = Omit<InventoryItem, 'id' | 'updatedAt'>;

export function isLowStock(item: InventoryItem): boolean {
  return item.quantity <= item.reorderLevel;
}
