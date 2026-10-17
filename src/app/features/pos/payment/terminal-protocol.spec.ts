import { CardTerminalError, parseTerminalLine, terminalErrorCode } from './terminal-protocol';

describe('parseTerminalLine', () => {
  it('interpreta la lectura de una tarjeta y normaliza el UID', () => {
    expect(
      parseTerminalLine(
        '{"evento":"tarjeta","uid":"a1b2c3d4","tipo":"MIFARE 1KB","monto":"2.50"}\r',
      ),
    ).toEqual({ evento: 'tarjeta', uid: 'A1B2C3D4', tipo: 'MIFARE 1KB', monto: '2.50' });
  });

  it('interpreta listo, timeout y errores', () => {
    expect(parseTerminalLine('{"evento":"listo","lector":"0x92"}')).toEqual({
      evento: 'listo',
      lector: '0x92',
    });
    expect(parseTerminalLine('{"evento":"timeout"}')).toEqual({ evento: 'timeout' });
    expect(parseTerminalLine('{"evento":"error","codigo":"LECTOR_NO_RESPONDE"}')).toEqual({
      evento: 'error',
      codigo: 'LECTOR_NO_RESPONDE',
    });
  });

  it('ignora ruido, líneas cortadas y eventos desconocidos', () => {
    expect(parseTerminalLine('')).toBeNull();
    expect(parseTerminalLine('Firmware Version: 0x92')).toBeNull();
    expect(parseTerminalLine('{"evento":"tarj')).toBeNull();
    expect(parseTerminalLine('{"evento":"otro"}')).toBeNull();
    expect(parseTerminalLine('{"evento":"tarjeta","uid":""}')).toBeNull();
  });

  it('traduce códigos de error del lector', () => {
    expect(terminalErrorCode('LECTOR_NO_RESPONDE')).toBe('LECTOR_NO_RESPONDE');
    expect(terminalErrorCode('XYZ')).toBe('DESCONOCIDO');
    expect(new CardTerminalError('TIEMPO_AGOTADO').message).toContain('tarjeta');
  });
});
