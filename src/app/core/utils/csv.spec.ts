import { toCsv } from './csv';

describe('toCsv', () => {
  it('escapa comas y comillas', () => {
    expect(toCsv(['a', 'b'], [['x, y', 'dijo "hola"'], [1, null]])).toBe('a,b\r\n"x, y","dijo ""hola"""\r\n1,');
  });
});
