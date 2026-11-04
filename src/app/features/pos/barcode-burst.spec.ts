import { BarcodeBurst, BurstResult } from './barcode-burst';

/** Teclea `text` como el lector: una tecla cada `gap` ms desde `start`, y Enter al final. */
function type(burst: BarcodeBurst, text: string, gap: number, start = 1000): BurstResult[] {
  const keys = [...text, 'Enter'];
  return keys.map((key, i) => burst.feed({ key, time: start + i * gap }));
}

describe('Lector de código de barras (HU-34)', () => {
  it('una ráfaga rápida terminada en Enter entrega el código completo', () => {
    const results = type(new BarcodeBurst(), 'E2E-007', 8);

    expect(results.at(-1)).toEqual({ kind: 'code', code: 'E2E-007' });
  });

  it('el «-» dentro de la ráfaga se traga: no llega a los atajos', () => {
    const results = type(new BarcodeBurst(), 'E2E-007', 8);

    // La primera tecla pasa (todavía no se sabe que es un escaneo); el resto es parte del código.
    expect(results[0]).toEqual({ kind: 'pass' });
    expect(results[3]).toEqual({ kind: 'swallow' });
    expect(results.slice(1, -1).every((r) => r.kind === 'swallow')).toBe(true);
  });

  it('a velocidad de persona no es un escaneo: el «-» sigue siendo el atajo', () => {
    const results = type(new BarcodeBurst(), 'E2-', 180);

    expect(results.every((r) => r.kind === 'pass')).toBe(true);
  });

  it('las mayúsculas del lector (Shift entre teclas) no cortan la ráfaga', () => {
    const burst = new BarcodeBurst();
    const keys = ['Shift', 'P', 'Shift', 'F', '-', '0', '0', '1', 'Enter'];

    const results = keys.map((key, i) => burst.feed({ key, time: 500 + i * 5 }));

    expect(results.at(-1)).toEqual({ kind: 'code', code: 'PF-001' });
  });

  it('un código demasiado corto o un Enter suelto siguen de largo', () => {
    expect(type(new BarcodeBurst(), 'AB', 5).at(-1)).toEqual({ kind: 'pass' });
    expect(new BarcodeBurst().feed({ key: 'Enter', time: 10 })).toEqual({ kind: 'pass' });
  });

  it('una pausa larga antes del Enter descarta la ráfaga', () => {
    const burst = new BarcodeBurst();
    ['A', 'B', 'C'].forEach((key, i) => burst.feed({ key, time: i * 5 }));

    expect(burst.feed({ key: 'Enter', time: 400 })).toEqual({ kind: 'pass' });
  });

  it('la tecla mantenida (autorrepetición) y los atajos con Ctrl no forman ráfagas', () => {
    const burst = new BarcodeBurst();
    burst.feed({ key: '+', time: 0 });

    expect(burst.feed({ key: '+', time: 20, repeat: true })).toEqual({ kind: 'pass' });
    expect(burst.feed({ key: '+', time: 25 })).toEqual({ kind: 'pass' });
    expect(burst.feed({ key: 'n', time: 30, modified: true })).toEqual({ kind: 'pass' });
  });
});
