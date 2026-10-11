import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { Id } from '../models/api.model';
import { CatalogProduct } from '../models/catalog.model';
import { SaleRequest } from '../models/order.model';

export interface CartLine {
  readonly productId: Id;
  readonly name: string;
  readonly unitPrice: number;
  readonly quantity: number;
}

const STORAGE_KEY = 'sigpan.cart';
const MAX_QUANTITY = 99;

/**
 * Carrito del cliente, persistido en localStorage. Los precios que muestra son
 * informativos: el total que se cobra lo calcula el backend.
 */
@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly items = signal<readonly CartLine[]>(this.restore());

  readonly lines = this.items.asReadonly();
  readonly count = computed(() => this.items().reduce((sum, line) => sum + line.quantity, 0));
  readonly subtotal = computed(() =>
    this.items().reduce((sum, line) => sum + line.unitPrice * line.quantity, 0),
  );
  readonly isEmpty = computed(() => this.items().length === 0);

  constructor() {
    effect(() => {
      const lines = this.items();
      if (this.isBrowser) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
      }
    });
  }

  add(product: CatalogProduct, quantity = 1): void {
    this.items.update((lines) => {
      const existing = lines.find((line) => line.productId === product.id);
      if (existing) {
        return lines.map((line) =>
          line.productId === product.id
            ? { ...line, quantity: clamp(line.quantity + quantity) }
            : line,
        );
      }
      return [
        ...lines,
        {
          productId: product.id,
          name: product.nombre,
          unitPrice: Number(product.precio),
          quantity: clamp(quantity),
        },
      ];
    });
  }

  setQuantity(productId: Id, quantity: number): void {
    if (quantity <= 0) {
      this.remove(productId);
      return;
    }
    this.items.update((lines) =>
      lines.map((line) =>
        line.productId === productId ? { ...line, quantity: clamp(quantity) } : line,
      ),
    );
  }

  remove(productId: Id): void {
    this.items.update((lines) => lines.filter((line) => line.productId !== productId));
  }

  clear(): void {
    this.items.set([]);
  }

  /** Solo producto y cantidad, que es lo que espera el backend. */
  toOrderRequest(): SaleRequest {
    return {
      lineas: this.items().map(({ productId, quantity }) => ({
        productoId: productId,
        cantidad: quantity,
      })),
    };
  }

  // localStorage es editable, así que se valida línea por línea.
  private restore(): readonly CartLine[] {
    if (!this.isBrowser) return [];

    try {
      const raw: unknown = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
      return Array.isArray(raw) ? raw.filter(isCartLine).map((l) => ({ ...l, quantity: clamp(l.quantity) })) : [];
    } catch {
      return [];
    }
  }
}

function clamp(quantity: number): number {
  return Math.min(Math.max(Math.trunc(quantity) || 1, 1), MAX_QUANTITY);
}

function isCartLine(value: unknown): value is CartLine {
  const line = value as Partial<CartLine> | null;
  return (
    !!line &&
    typeof line.productId === 'number' &&
    typeof line.name === 'string' &&
    typeof line.unitPrice === 'number' &&
    Number.isFinite(line.unitPrice) &&
    typeof line.quantity === 'number'
  );
}
