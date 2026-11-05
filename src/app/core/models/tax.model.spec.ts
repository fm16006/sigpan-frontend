import {
  DEFAULT_TAX,
  TaxConfig,
  describeExemptChange,
  describeTaxChange,
  sameTax,
  showsPlusTax,
  taxExample,
  taxRateLabel,
} from './tax.model';

const incluido13: TaxConfig = { aplicaIva: true, ivaIncluido: true, tasaIva: 13 };

describe('describeTaxChange', () => {
  it('sin cambios no hay nada que confirmar', () => {
    expect(describeTaxChange(incluido13, { ...incluido13 })).toBeNull();
    expect(describeTaxChange(incluido13, { ...incluido13, tasaIva: 13.0 })).toBeNull();
  });

  it('siempre aclara que aplica desde la próxima venta y que lo registrado no cambia', () => {
    const notes = describeTaxChange(incluido13, { ...incluido13, ivaIncluido: false })!;

    expect(notes[0]).toContain('próxima venta');
    expect(notes[0]).toContain('ya registrados no cambian');
  });

  it('avisa que los borradores del punto de venta y los carritos se recalculan al cobrar', () => {
    const notes = describeTaxChange(incluido13, { ...incluido13, aplicaIva: false })!;

    expect(notes.at(-1)).toContain('borrador');
    expect(notes.at(-1)).toContain('carritos');
    expect(notes.at(-1)).toContain('recalculan al cobrar');
  });

  it('al pasar a "no incluido" explica que se paga el precio más el IVA con un ejemplo de la tasa nueva', () => {
    const notes = describeTaxChange(incluido13, { ...incluido13, ivaIncluido: false })!;
    expect(notes.join(' ')).toContain('un producto de $1.00 se cobrará $1.13');

    const sixteen = describeTaxChange(incluido13, { aplicaIva: true, ivaIncluido: false, tasaIva: 16 })!;
    expect(sixteen.join(' ')).toContain('se cobrará $1.16');
  });

  it('al pasar a "incluido" explica que el precio ya contiene el IVA y el total no sube', () => {
    const notes = describeTaxChange({ ...incluido13, ivaIncluido: false }, incluido13)!;

    expect(notes.join(' ')).toContain('ya contiene el IVA');
    expect(notes.join(' ')).toContain('no sube');
  });

  it('al desactivar el IVA explica que los tickets dejan de mostrarlo', () => {
    const notes = describeTaxChange(incluido13, { ...incluido13, aplicaIva: false })!;

    expect(notes.join(' ')).toContain('los tickets ya no muestran IVA');
    expect(notes.join(' ')).not.toContain('se cobrará');
  });

  it('al reactivar el IVA lo dice y explica el modo elegido', () => {
    const notes = describeTaxChange({ ...incluido13, aplicaIva: false }, incluido13)!;

    expect(notes.join(' ')).toContain('Se vuelve a aplicar IVA');
    expect(notes.join(' ')).toContain('ya contiene el IVA');
  });

  it('al cambiar la tasa muestra el valor anterior y el nuevo', () => {
    const notes = describeTaxChange(incluido13, { ...incluido13, tasaIva: 15 })!;

    expect(notes.join(' ')).toContain('de 13 % a 15 %');
  });

  it('cambiar solo la tasa con IVA no incluido repite el ejemplo con la tasa nueva', () => {
    const before: TaxConfig = { aplicaIva: true, ivaIncluido: false, tasaIva: 13 };
    const notes = describeTaxChange(before, { ...before, tasaIva: 10 })!;

    expect(notes.join(' ')).toContain('de 13 % a 10 %');
    expect(notes.join(' ')).toContain('se cobrará $1.10');
  });
});

describe('describeExemptChange', () => {
  it('explica los dos sentidos del cambio y que lo registrado no cambia', () => {
    const on = describeExemptChange(true);
    const off = describeExemptChange(false);

    expect(on[0]).toContain('sin IVA');
    expect(off[0]).toContain('volverá a llevar IVA');
    expect(on[1]).toContain('ya registrados no cambian');
  });
});

describe('ayudas de IVA', () => {
  it('formatea la tasa', () => {
    expect(taxRateLabel(13)).toBe('13 %');
    expect(taxRateLabel(16.5)).toBe('16.5 %');
    expect(taxRateLabel(12.0)).toBe('12 %');
  });

  it('da el ejemplo de $1.00 con la tasa', () => {
    expect(taxExample(13)).toBe('$1.13');
    expect(taxExample(0)).toBe('$1.00');
  });

  it('el catálogo solo avisa "+ IVA" si aplica, no va incluido y el producto no es exento', () => {
    const noIncluido: TaxConfig = { aplicaIva: true, ivaIncluido: false, tasaIva: 13 };

    expect(showsPlusTax(noIncluido, false)).toBe(true);
    expect(showsPlusTax(noIncluido, undefined)).toBe(true);
    expect(showsPlusTax(noIncluido, true)).toBe(false);
    expect(showsPlusTax(DEFAULT_TAX, false)).toBe(false);
    expect(showsPlusTax({ ...noIncluido, aplicaIva: false }, false)).toBe(false);
  });

  it('compara configuraciones por valor', () => {
    expect(sameTax(incluido13, { ...incluido13 })).toBe(true);
    expect(sameTax(incluido13, { ...incluido13, tasaIva: 13.01 })).toBe(false);
  });
});
