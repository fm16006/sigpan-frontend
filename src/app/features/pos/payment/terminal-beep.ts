// Pitidos de la terminal con Web Audio: uno suave al pedir la tarjeta, uno corto
// al leerla, dos al aprobar y uno grave y largo al rechazar.
type BeepPattern = 'presentar' | 'lectura' | 'aprobada' | 'rechazada';

const PATTERNS: Readonly<
  Record<BeepPattern, readonly [hz: number, ms: number, pausaMs: number][]>
> = {
  presentar: [[1_500, 140, 0]],
  lectura: [[2_400, 90, 0]],
  aprobada: [
    [2_000, 110, 70],
    [2_600, 160, 0],
  ],
  rechazada: [[420, 450, 0]],
};

let context: AudioContext | null = null;

export function beep(pattern: BeepPattern): void {
  try {
    context ??= new AudioContext();
    let start = context.currentTime + 0.01;

    for (const [hz, ms, pausaMs] of PATTERNS[pattern]) {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'square';
      oscillator.frequency.value = hz;
      gain.gain.setValueAtTime(0.05, start);
      gain.gain.setValueAtTime(0, start + ms / 1000);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(start);
      oscillator.stop(start + ms / 1000);
      start += (ms + pausaMs) / 1000;
    }
  } catch {
    // Sin audio (SSR, permisos o navegador sin Web Audio): la terminal sigue funcionando.
  }
}
