/** Indicadores del panel, calculados por el backend. */
export interface SalesSummary {
  readonly salesToday: number;
  readonly ordersToday: number;
  readonly pendingOrders: number;
  readonly lowStockItems: number;
}

export const EMPTY_SUMMARY: SalesSummary = {
  salesToday: 0,
  ordersToday: 0,
  pendingOrders: 0,
  lowStockItems: 0,
};
