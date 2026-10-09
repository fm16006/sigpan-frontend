import { Id } from './api.model';

export const DISCOUNT_TYPES = ['PERCENTAGE', 'FIXED'] as const;

export type DiscountType = (typeof DISCOUNT_TYPES)[number];

export interface Promotion {
  readonly id: Id;
  readonly name: string;
  readonly description: string;
  readonly discountType: DiscountType;
  /** Porcentaje o monto fijo, según discountType. */
  readonly discountValue: number;
  readonly startsAt: string;
  readonly endsAt: string;
  readonly active: boolean;
}

export type PromotionDraft = Omit<Promotion, 'id'>;
