import { RegisterBranch } from '../../core/models/branch.model';
import { activeRegisters, registerLabel } from './register-utils';

describe('registerLabel', () => {
  it('muestra solo la caja', () => {
    expect(registerLabel('Caja 01')).toBe('Caja 01');
  });

  it('sin caja guardada dice "Caja"', () => {
    expect(registerLabel(null)).toBe('Caja');
    expect(registerLabel(undefined)).toBe('Caja');
    expect(registerLabel('  ')).toBe('Caja');
  });
});

describe('activeRegisters', () => {
  it('deja solo las cajas activas', () => {
    const principal: RegisterBranch = {
      id: 1,
      nombre: 'Principal',
      codigo: 'PRI',
      cajas: [
        { id: 1, nombre: 'Caja 01', codigo: 'C01', activo: true },
        { id: 2, nombre: 'Caja 02', codigo: 'C02', activo: false },
      ],
    };

    expect(activeRegisters(principal).map((register) => register.id)).toEqual([1]);
  });

  it('sin respuesta no hay cajas', () => {
    expect(activeRegisters(undefined)).toEqual([]);
    expect(activeRegisters(null)).toEqual([]);
  });
});
