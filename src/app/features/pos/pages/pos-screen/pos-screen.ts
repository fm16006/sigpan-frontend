import { Component, computed, inject, signal } from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { Auth } from '../../../../core/services/auth';

interface PosProduct {
  id: number;
  code: string;
  name: string;
  price: number;
  category: string;
}

interface TicketLine {
  product: PosProduct;
  quantity: number;
}

const MOCK_PRODUCTS: PosProduct[] = [
  { id: 1, code: '001', name: 'Pan francés', price: 0.15, category: 'Salado' },
  { id: 2, code: '002', name: 'Semita', price: 0.5, category: 'Dulce' },
  { id: 3, code: '003', name: 'Concha', price: 0.6, category: 'Dulce' },
  { id: 4, code: '004', name: 'Quesadilla', price: 0.75, category: 'Dulce' },
  { id: 5, code: '005', name: 'Baguette', price: 1.5, category: 'Salado' },
  { id: 6, code: '006', name: 'Pan de yema', price: 0.4, category: 'Salado' },
  { id: 7, code: '007', name: 'Cheesecake', price: 2.5, category: 'Pastel' },
  { id: 8, code: '008', name: 'Pastel de chocolate', price: 2.25, category: 'Pastel' },
  { id: 9, code: '009', name: 'Café americano', price: 1.0, category: 'Bebidas' },
  { id: 10, code: '010', name: 'Horchata', price: 1.25, category: 'Bebidas' },
  { id: 11, code: '011', name: 'Torta de vainilla', price: 12.0, category: 'Pastel' },
  { id: 12, code: '012', name: 'Pan integral', price: 0.35, category: 'Salado' },
];

const CATEGORIES = ['Todos', 'Dulce', 'Salado', 'Pastel', 'Bebidas'];
const TAX_RATE = 0.13; // IVA El Salvador

@Component({
  selector: 'app-pos-screen',
  imports: [CurrencyPipe],
  templateUrl: './pos-screen.html',
  styleUrl: './pos-screen.css',
})
export class PosScreen {
  private auth = inject(Auth);

  protected cashierName = computed(() => this.auth.user()?.name ?? 'Cajero');
  protected registerLabel = 'Caja 1';

  protected categories = CATEGORIES;
  protected searchTerm = signal('');
  protected selectedCategory = signal('Todos');
  protected ticketLines = signal<TicketLine[]>([]);

  protected showPaymentModal = signal(false);
  protected paymentMethod = signal<'CASH' | 'CARD' | null>(null);
  protected cashReceived = signal(0);

  protected showCashCutModal = signal(false);
  protected cashCounted = signal(0);
  protected completedSales = signal<number[]>([]);

  protected showVoidModal = signal(false);

  protected filteredProducts = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const category = this.selectedCategory();

    return MOCK_PRODUCTS.filter((p) => {
      const matchesCategory = category === 'Todos' || p.category === category;
      const matchesSearch =
        !term || p.name.toLowerCase().includes(term) || p.code.includes(term);
      return matchesCategory && matchesSearch;
    });
  });

  protected subtotal = computed(() =>
    this.ticketLines().reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  );
  protected taxAmount = computed(() => this.subtotal() * TAX_RATE);
  protected total = computed(() => this.subtotal() + this.taxAmount());

  protected change = computed(() => Math.max(0, this.cashReceived() - this.total()));

  protected canConfirmPayment = computed(() => {
    if (this.ticketLines().length === 0) return false;
    if (this.paymentMethod() === 'CASH') return this.cashReceived() >= this.total();
    return this.paymentMethod() === 'CARD';
  });

  // --- Corte de caja: solo lo básico, sin reportes avanzados ---
  protected sessionSalesTotal = computed(() =>
    this.completedSales().reduce((sum, sale) => sum + sale, 0)
  );
  protected sessionSalesCount = computed(() => this.completedSales().length);
  protected cashDifference = computed(() => this.cashCounted() - this.sessionSalesTotal());

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  addToTicket(product: PosProduct): void {
    this.ticketLines.update((lines) => {
      const existing = lines.find((l) => l.product.id === product.id);
      if (existing) {
        return lines.map((l) =>
          l.product.id === product.id ? { ...l, quantity: l.quantity + 1 } : l
        );
      }
      return [...lines, { product, quantity: 1 }];
    });
  }

  incrementLine(productId: number): void {
    this.ticketLines.update((lines) =>
      lines.map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity + 1 } : l))
    );
  }

  decrementLine(productId: number): void {
    this.ticketLines.update((lines) =>
      lines
        .map((l) => (l.product.id === productId ? { ...l, quantity: l.quantity - 1 } : l))
        .filter((l) => l.quantity > 0)
    );
  }

  removeLine(productId: number): void {
    this.ticketLines.update((lines) => lines.filter((l) => l.product.id !== productId));
  }

  // --- Pago ---
  openPayment(): void {
    if (this.ticketLines().length === 0) return;
    this.paymentMethod.set(null);
    this.cashReceived.set(0);
    this.showPaymentModal.set(true);
  }

  closePayment(): void {
    this.showPaymentModal.set(false);
  }

  selectPaymentMethod(method: 'CASH' | 'CARD'): void {
    this.paymentMethod.set(method);
    this.cashReceived.set(0);
  }

  addQuickCash(amount: number): void {
    this.cashReceived.update((v) => v + amount);
  }

  confirmPayment(): void {
    if (!this.canConfirmPayment()) return;
    // Registra la venta para el corte de caja del turno.
    this.completedSales.update((sales) => [...sales, this.total()]);
    this.ticketLines.set([]);
    this.showPaymentModal.set(false);
  }

  // --- Corte de caja ---
  openCashCut(): void {
    this.cashCounted.set(0);
    this.showCashCutModal.set(true);
  }

  closeCashCut(): void {
    this.showCashCutModal.set(false);
  }

  // --- Anulación de venta: UI lista, lógica pendiente ---
  openVoid(): void {
    this.showVoidModal.set(true);
  }

  closeVoid(): void {
    this.showVoidModal.set(false);
  }

  confirmVoid(): void {
    // TODO: conectar con el backend para anular la última venta registrada
    // (requiere autorización/PIN de supervisor según la lógica de negocio real).
    this.showVoidModal.set(false);
  }
}