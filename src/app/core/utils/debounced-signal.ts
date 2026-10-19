import { Signal, effect, signal, untracked } from '@angular/core';

/**
 * Copia de `source` que solo cambia cuando la fuente se mantiene quieta `delayMs`.
 * Debe crearse en un contexto de inyección (constructor o inicializador de campo).
 */
export function debouncedSignal<T>(source: Signal<T>, delayMs: number): Signal<T> {
  const debounced = signal(untracked(source));

  effect((onCleanup) => {
    const value = source();
    const timer = setTimeout(() => debounced.set(value), delayMs);
    onCleanup(() => clearTimeout(timer));
  });

  return debounced.asReadonly();
}
