import { Component, computed, effect, inject, signal, untracked } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { Subject, catchError, debounceTime, of, switchMap, tap } from 'rxjs';
import { PROMOTION_TYPE_LABELS } from '../../../../../core/models/promotion.model';
import { Quote } from '../../../../../core/models/quote.model';
import { Auth } from '../../../../../core/services/auth';
import { QuoteService } from '../../../../../core/services/quote.service';
import { todayIso } from '../../../../../core/utils/dates';
import { MoneyPipe } from '../../../../../shared/pipes/money.pipe';
import { Icon } from '../../../../../shared/ui/icon/icon';
import { StatusChip } from '../../../../../shared/ui/status-chip/status-chip';
import { PROMOTION_CHIPS, promotionState } from '../../../product-view';
import { ProductContext } from '../product-context';

const QUICK_QUANTITIES = [6, 12, 24] as const;

@Component({
  selector: 'app-product-pricing',
  imports: [RouterLink, DatePipe, DecimalPipe, MoneyPipe, Icon, StatusChip],
  templateUrl: './product-pricing.html',
})
export class ProductPricing {
  protected readonly ctx = inject(ProductContext);
  private readonly quotes = inject(QuoteService);
  private readonly auth = inject(Auth);

  protected readonly product = this.ctx.product;
  /** Solo administración cambia el precio. */
  protected readonly isAdmin = this.auth.hasAnyRole(['ADMINISTRADOR']);
  /** El backend solo cotiza para administración, caja y clientes. */
  protected readonly canQuote = this.auth.hasAnyRole(['ADMINISTRADOR', 'CAJERO']);
  protected readonly quickQuantities = QUICK_QUANTITIES;
  protected readonly promotionTypeLabels = PROMOTION_TYPE_LABELS;
  protected readonly promotionChips = PROMOTION_CHIPS;
  private readonly today = todayIso();

  /** Tramos de mayoreo; el primero activo marca dónde termina el precio base. */
  protected readonly firstTierFrom = computed(
    () => this.ctx.scales().find((scale) => scale.activo)?.cantidadMinima ?? null,
  );

  // Simulador: cada cambio de cantidad cotiza en el backend, que es quien aplica las reglas.
  protected readonly qty = signal(1);
  protected readonly quote = signal<Quote | null>(null);
  protected readonly quoting = signal(false);
  protected readonly quoteFailed = signal(false);
  private readonly request$ = new Subject<{ productoId: number; cantidad: number }>();

  constructor() {
    this.request$
      .pipe(
        tap(() => {
          this.quoting.set(true);
          this.quoteFailed.set(false);
        }),
        debounceTime(250),
        switchMap((line) =>
          this.quotes.quote({ lineas: [line] }).pipe(
            catchError(() => {
              this.quoteFailed.set(true);
              return of(null);
            }),
          ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((quote) => {
        this.quoting.set(false);
        if (quote) {
          this.quote.set(quote);
        }
      });

    effect(() => {
      const product = this.product();
      const cantidad = this.qty();
      if (this.canQuote && product) {
        untracked(() => this.request$.next({ productoId: product.id, cantidad }));
      }
    });
  }

  protected setQty(value: number): void {
    this.qty.set(Math.max(1, Math.floor(value)));
  }

  protected stateOf(promotion: Parameters<typeof promotionState>[0]) {
    return promotionState(promotion, this.today);
  }
}
