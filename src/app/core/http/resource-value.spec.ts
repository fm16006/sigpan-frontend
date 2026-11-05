import { valueOr } from './resource-value';

describe('valueOr', () => {
  it('devuelve el valor cuando el recurso lo tiene', () => {
    expect(valueOr({ hasValue: () => true, value: () => [1, 2] }, [])).toEqual([1, 2]);
  });

  it('devuelve el respaldo sin leer value() cuando el recurso está en error', () => {
    const resource = {
      hasValue: () => false,
      value: (): number[] => {
        throw new Error('ResourceValueError');
      },
    };
    expect(valueOr(resource, [9])).toEqual([9]);
  });
});
