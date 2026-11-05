/**
 * Valor de un recurso (`resource` / `httpResource`) sin lanzar: `value()` lanza `ResourceValueError`
 * cuando el recurso está en error, incluso con `defaultValue`. La pantalla ya muestra ese error aparte
 * (`app-resource-state`), así que aquí se cae al valor de respaldo.
 */
export function valueOr<T>(resource: { hasValue(): boolean; value(): T }, fallback: T): T {
  return resource.hasValue() ? resource.value() : fallback;
}
