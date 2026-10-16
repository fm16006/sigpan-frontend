import {
  FAILURE_BLOCK,
  authorizeCard,
  failureSchedule,
  randomCardNumber,
} from './card-authorization';

const cards = {
  AAAA0001: { saldo: 5 },
  BBBB0002: { saldo: 100, bloqueada: true },
};
const read = (uid: string) => ({ uid, tipo: 'MIFARE 1KB' });
const options = { cards, fails: () => false };

describe('authorizeCard', () => {
  it('aprueba tarjetas sin reglas con marca y últimos dígitos sorteados', () => {
    const decision = authorizeCard(read('04a1b2c3'), 12.5, {
      ...options,
      random: () => 0,
      authorizationCode: () => '123456',
    });
    expect(decision).toEqual({
      aprobada: true,
      pago: { uid: '04A1B2C3', marca: 'VISA', ultimos: '0000', autorizacion: '123456' },
    });
  });

  it('rechaza por fondos insuficientes', () => {
    expect(authorizeCard(read('AAAA0001'), 5, options).aprobada).toBe(true);
    const decision = authorizeCard(read('AAAA0001'), 5.01, options);
    expect(!decision.aprobada && decision.motivo).toContain('Fondos insuficientes');
  });

  it('rechaza tarjetas bloqueadas', () => {
    const decision = authorizeCard(read('BBBB0002'), 1, options);
    expect(!decision.aprobada && decision.motivo).toContain('bloqueada');
  });
});

describe('fallas simuladas', () => {
  it('falla exactamente un cobro de cada bloque de 3', () => {
    const fails = failureSchedule();
    for (let block = 0; block < 5; block++) {
      const results = Array.from({ length: FAILURE_BLOCK }, () => fails());
      expect(results.filter(Boolean)).toHaveLength(1);
    }
  });

  it('una falla programada rechaza la tarjeta aunque no tenga reglas', () => {
    const decision = authorizeCard(read('04A1B2C3'), 1, { cards, fails: () => true });
    expect(decision.aprobada).toBe(false);
  });

  it('las fallas temporales piden intentar de nuevo', () => {
    const decision = authorizeCard(read('04A1B2C3'), 1, {
      cards,
      fails: () => true,
      random: () => 0.99,
    });
    expect(!decision.aprobada && decision.temporal).toBe(true);
    expect(!decision.aprobada && decision.motivo).toContain('Intente de nuevo');
  });
});

describe('randomCardNumber', () => {
  it('sortea la marca según su proporción', () => {
    expect(randomCardNumber(() => 0.1).marca).toBe('VISA');
    expect(randomCardNumber(() => 0.6).marca).toBe('MASTERCARD');
    expect(randomCardNumber(() => 0.95).marca).toBe('AMEX');
  });

  it('siempre da 4 dígitos', () => {
    expect(randomCardNumber(() => 0).ultimos).toBe('0000');
    expect(randomCardNumber(() => 0.999).ultimos).toBe('9990');
    expect(randomCardNumber().ultimos).toMatch(/^\d{4}$/);
  });
});
