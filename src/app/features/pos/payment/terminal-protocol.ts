// Mensajes que envía el sketch arduino/terminal_pago (una línea JSON por evento).
export type TerminalEvent =
  | { readonly evento: 'listo' | 'pong'; readonly lector: string }
  | { readonly evento: 'esperando'; readonly monto: string }
  | {
      readonly evento: 'tarjeta';
      readonly uid: string;
      readonly tipo: string;
      readonly monto: string;
    }
  | { readonly evento: 'cancelado' | 'timeout' | 'desconectado' }
  | { readonly evento: 'error'; readonly codigo: string };

export type TerminalErrorCode =
  | 'NO_SOPORTADO'
  | 'SIN_PUERTO'
  | 'PUERTO_OCUPADO'
  | 'SIN_RESPUESTA'
  | 'DESCONECTADO'
  | 'TIEMPO_AGOTADO'
  | 'LECTOR_NO_RESPONDE'
  | 'MONTO_INVALIDO'
  | 'OCUPADO'
  | 'COMANDO_DESCONOCIDO'
  | 'DESCONOCIDO';

const MESSAGES: Readonly<Record<TerminalErrorCode, string>> = {
  NO_SOPORTADO: 'Este navegador no puede usar terminales POS. Abra el sistema en Chrome o Edge.',
  SIN_PUERTO: 'Conecte la terminal al equipo y vuelva a intentarlo.',
  PUERTO_OCUPADO: 'La terminal está en uso por otra aplicación.',
  SIN_RESPUESTA: 'La terminal no responde. Desconéctela y vuelva a conectarla.',
  DESCONECTADO: 'Se perdió la conexión con la terminal.',
  TIEMPO_AGOTADO: 'Tiempo agotado: no se presentó ninguna tarjeta.',
  LECTOR_NO_RESPONDE: 'La terminal reporta una falla en el lector de tarjetas.',
  MONTO_INVALIDO: 'La terminal rechazó el monto.',
  OCUPADO: 'La terminal tiene otra transacción en curso.',
  COMANDO_DESCONOCIDO: 'La terminal no reconoció la operación.',
  DESCONOCIDO: 'Error de comunicación con la terminal.',
};

export class CardTerminalError extends Error {
  constructor(readonly code: TerminalErrorCode) {
    super(MESSAGES[code]);
    this.name = 'CardTerminalError';
  }
}

export function terminalErrorMessage(error: unknown): string {
  return error instanceof CardTerminalError ? error.message : MESSAGES.DESCONOCIDO;
}

export function terminalErrorCode(codigo: string): TerminalErrorCode {
  return codigo in MESSAGES ? (codigo as TerminalErrorCode) : 'DESCONOCIDO';
}

/** Interpreta una línea del puerto serie; devuelve null si no es un evento válido. */
export function parseTerminalLine(line: string): TerminalEvent | null {
  const text = line.trim();
  if (!text.startsWith('{')) {
    return null;
  }

  let data: Record<string, unknown>;
  try {
    data = JSON.parse(text);
  } catch {
    return null;
  }

  const field = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '');

  switch (data['evento']) {
    case 'listo':
    case 'pong':
      return { evento: data['evento'], lector: field('lector') };
    case 'esperando':
      return { evento: 'esperando', monto: field('monto') };
    case 'tarjeta':
      return field('uid')
        ? {
            evento: 'tarjeta',
            uid: field('uid').toUpperCase(),
            tipo: field('tipo'),
            monto: field('monto'),
          }
        : null;
    case 'cancelado':
    case 'timeout':
      return { evento: data['evento'] };
    case 'error':
      return { evento: 'error', codigo: field('codigo') };
    default:
      return null;
  }
}
