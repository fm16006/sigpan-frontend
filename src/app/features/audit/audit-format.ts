/**
 * Convierte el valor guardado en la bitacora (JSON) en texto legible.
 * Un valor vacio o nulo se muestra como guion. Si no es JSON valido, se muestra tal cual.
 */
export function formatearValor(valor: string | null | undefined): string {
  if (valor === null || valor === undefined || valor.trim() === '') {
    return '—';
  }

  let dato: unknown;
  try {
    dato = JSON.parse(valor);
  } catch {
    return valor;
  }
  return formatearDato(dato);
}

function formatearDato(dato: unknown): string {
  if (dato === null || dato === undefined) {
    return '—';
  }
  if (Array.isArray(dato)) {
    return dato.map(formatearDato).join(', ');
  }
  if (typeof dato === 'object') {
    return Object.entries(dato as Record<string, unknown>)
      .map(([clave, valor]) => `${clave}: ${formatearDato(valor)}`)
      .join('; ');
  }
  return String(dato);
}
