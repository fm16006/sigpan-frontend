/**
 * HU-34: el lector de código de barras "teclea" el código muy rápido y termina con Enter. Una persona
 * no escribe dos teclas a menos de 50 ms, así que una ráfaga así es un escaneo aunque el foco no esté
 * en el buscador. Sin esto, el «-» de un código como `E2E-007` se tomaba como el atajo «menos».
 */
export const SCAN_GAP_MS = 50;
/**
 * Ya empezada la ráfaga se tolera más separación: con el equipo cargado las teclas del lector llegan
 * a 14–41 ms y, si la ráfaga se cortaba a la mitad, el «-» volvía a los atajos y borraba una línea.
 */
export const SCAN_BURST_GAP_MS = 100;
/** Largo mínimo de lo que se acepta como código (evita tomar dos teclas sueltas por un escaneo). */
export const SCAN_MIN_LENGTH = 3;

/** Qué hacer con la tecla: seguir con los atajos, tragarla (es parte del código) o buscar el código. */
export type BurstResult =
  | { readonly kind: 'pass' }
  | { readonly kind: 'swallow' }
  | { readonly kind: 'code'; readonly code: string };

export interface BurstKey {
  readonly key: string;
  /** Instante de la tecla en ms (`event.timeStamp`). */
  readonly time: number;
  /** Tecla mantenida (autorrepetición): nunca es un escaneo. */
  readonly repeat?: boolean;
  /** Ctrl, Alt o Meta: es un atajo, no un código. */
  readonly modified?: boolean;
}

/** Teclas que el lector manda entre caracteres (mayúsculas) y que no cortan la ráfaga. */
const IGNORED_KEYS = new Set(['Shift', 'CapsLock']);

/**
 * Acumula las teclas que llegan fuera de un campo de texto. La primera tecla de una ráfaga pasa
 * (todavía no se sabe que es un escaneo); las siguientes, si llegan a menos de `SCAN_GAP_MS` de la
 * anterior (`SCAN_BURST_GAP_MS` una vez empezada la ráfaga), se tragan, y el Enter que cierra la
 * ráfaga entrega el código completo.
 */
export class BarcodeBurst {
  private buffer = '';
  private last = Number.NEGATIVE_INFINITY;

  feed(event: BurstKey): BurstResult {
    if (event.repeat || event.modified) {
      this.reset();
      return { kind: 'pass' };
    }
    if (IGNORED_KEYS.has(event.key)) {
      return { kind: 'pass' };
    }
    const limit = this.buffer.length >= 2 ? SCAN_BURST_GAP_MS : SCAN_GAP_MS;
    const fast = this.buffer.length > 0 && event.time - this.last < limit;

    if (event.key === 'Enter') {
      const code = this.buffer;
      this.reset();
      return fast && code.length >= SCAN_MIN_LENGTH ? { kind: 'code', code } : { kind: 'pass' };
    }
    if (event.key.length !== 1) {
      this.reset();
      return { kind: 'pass' };
    }
    this.last = event.time;
    if (fast) {
      this.buffer += event.key;
      return { kind: 'swallow' };
    }
    this.buffer = event.key;
    return { kind: 'pass' };
  }

  reset(): void {
    this.buffer = '';
    this.last = Number.NEGATIVE_INFINITY;
  }
}
