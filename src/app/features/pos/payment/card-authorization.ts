import { CardBrand, CardPayment, CardRead } from '../models/checkout.model';

// Simula al banco emisor. Las tarjetas que no estén en la lista se aprueban;
// agregue aquí el UID de una tarjeta para probar rechazos.
export interface SimulatedCard {
  readonly saldo: number;
  readonly bloqueada?: boolean;
}

export const SIMULATED_CARDS: Readonly<Record<string, SimulatedCard>> = {
  // '2157F964': { saldo: 2 },                 // llavero azul: rechaza compras mayores a $2.00
  // 'C3C19D37': { saldo: 0, bloqueada: true }, // tarjeta blanca
};

// De cada bloque de 3 cobros, uno falla (en posición al azar), mezclando
// rechazos definitivos y fallas temporales que piden intentar de nuevo.
export const FAILURE_BLOCK = 3;

const FAILURES: readonly { readonly motivo: string; readonly temporal: boolean }[] = [
  { motivo: 'Fondos insuficientes.', temporal: false },
  { motivo: 'Transacción denegada por el banco emisor.', temporal: false },
  { motivo: 'Sin respuesta del banco emisor. Intente de nuevo.', temporal: true },
  { motivo: 'No se pudo leer la tarjeta correctamente. Intente de nuevo.', temporal: true },
];

/** Decide si el siguiente cobro falla: exactamente uno por bloque. */
export function failureSchedule(random: () => number = Math.random): () => boolean {
  let pending: boolean[] = [];
  return () => {
    if (pending.length === 0) {
      const failAt = Math.floor(random() * FAILURE_BLOCK);
      pending = Array.from({ length: FAILURE_BLOCK }, (_, index) => index === failAt);
    }
    return pending.shift()!;
  };
}

const nextFails = failureSchedule();

export type CardDecision =
  | { readonly aprobada: true; readonly pago: CardPayment }
  | { readonly aprobada: false; readonly motivo: string; readonly temporal: boolean };

export interface AuthorizationOptions {
  readonly cards?: Readonly<Record<string, SimulatedCard>>;
  readonly fails?: () => boolean;
  readonly random?: () => number;
  readonly authorizationCode?: () => string;
}

export function authorizeCard(
  read: CardRead,
  amount: number,
  {
    cards = SIMULATED_CARDS,
    fails = nextFails,
    random = Math.random,
    authorizationCode = randomAuthorizationCode,
  }: AuthorizationOptions = {},
): CardDecision {
  const uid = read.uid.toUpperCase();
  const card = cards[uid];

  if (card?.bloqueada) {
    return {
      aprobada: false,
      motivo: 'Tarjeta bloqueada. Comuníquese con su banco.',
      temporal: false,
    };
  }
  if (card && card.saldo < amount) {
    return { aprobada: false, motivo: 'Fondos insuficientes.', temporal: false };
  }
  if (fails()) {
    return { aprobada: false, ...FAILURES[Math.floor(random() * FAILURES.length)] };
  }

  return {
    aprobada: true,
    pago: { uid, ...randomCardNumber(random), autorizacion: authorizationCode() },
  };
}

// Proporción aproximada de cada marca en los cobros simulados.
const BRANDS: readonly [CardBrand, number][] = [
  ['VISA', 0.5],
  ['MASTERCARD', 0.35],
  ['AMEX', 0.15],
];

// El chip solo trae un UID, sin número ni marca: en cada cobro se sortean,
// así la misma tarjeta física pasa por tarjetas distintas.
export function randomCardNumber(random: () => number = Math.random): {
  marca: CardBrand;
  ultimos: string;
} {
  let point = random();
  const [marca] = BRANDS.find(([, share]) => (point -= share) < 0) ?? BRANDS[0];
  return { marca, ultimos: String(Math.floor(random() * 10_000)).padStart(4, '0') };
}

function randomAuthorizationCode(): string {
  return String(Math.floor(Math.random() * 1_000_000)).padStart(6, '0');
}
