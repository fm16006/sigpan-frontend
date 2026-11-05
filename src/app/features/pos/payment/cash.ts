/** Redondea a centavos. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/** Monto escrito en el campo de efectivo; null si está vacío o no es un número. */
export function parseCash(text: string): number | null {
  const value = Number(text);
  return text.trim() === '' || Number.isNaN(value) ? null : value;
}

/** Suma un billete a lo recibido y devuelve el texto del campo, siempre con dos decimales. */
export function addCash(text: string, amount: number): string {
  return roundMoney((parseCash(text) ?? 0) + amount).toFixed(2);
}

export interface CashChange {
  /** true cuando lo recibido no alcanza el total. */
  readonly short: boolean;
  /** Cambio por entregar, o lo que falta si `short`. Siempre positivo. */
  readonly amount: number;
}

/** Cambio exacto a dos decimales (HU-35). */
export function cashChange(received: number, total: number): CashChange {
  const difference = roundMoney(received - total);
  return { short: difference < 0, amount: Math.abs(difference) };
}
