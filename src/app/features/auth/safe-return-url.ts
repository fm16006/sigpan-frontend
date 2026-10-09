/**
 * Acepta solo rutas internas, para que el returnUrl no pueda llevar a otro
 * dominio. Se descarta //host, que el navegador trata como externo.
 */
export function safeReturnUrl(candidate: string | null, fallback = '/'): string {
  if (!candidate || !candidate.startsWith('/') || candidate.startsWith('//')) {
    return fallback;
  }
  return candidate;
}
