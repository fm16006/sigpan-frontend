import { addCash, cashChange, parseCash, roundMoney } from './cash';

describe('cash', () => {
  it('interpreta el texto del campo', () => {
    expect(parseCash('')).toBeNull();
    expect(parseCash('  ')).toBeNull();
    expect(parseCash('abc')).toBeNull();
    expect(parseCash('6.5')).toBe(6.5);
  });

  it('suma billetes sin arrastrar error de coma flotante', () => {
    expect(addCash('', 1)).toBe('1.00');
    expect(addCash('0.1', 0.2)).toBe('0.30');
    expect(addCash('5', 10)).toBe('15.00');
  });

  it('calcula el cambio exacto a dos decimales', () => {
    expect(cashChange(10, 6.55)).toEqual({ short: false, amount: 3.45 });
    expect(cashChange(6.55, 6.55)).toEqual({ short: false, amount: 0 });
    expect(cashChange(5, 6.55)).toEqual({ short: true, amount: 1.55 });
    expect(cashChange(0.3, 0.1 + 0.2)).toEqual({ short: false, amount: 0 });
  });

  it('redondea a centavos', () => {
    expect(roundMoney(0.1 + 0.2)).toBe(0.3);
    expect(roundMoney(6.554)).toBe(6.55);
  });
});
