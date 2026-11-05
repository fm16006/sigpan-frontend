import { companyErrorMessage, createCompanyForm } from './company-form';

const valid = () => ({
  razonSocial: 'SigPan, S.A. de C.V.',
  nombreComercial: 'Panadería SigPan',
  nit: '0614-010190-101-3',
  nrc: '123456-7',
  giro: 'Elaboración y venta de pan',
  direccion: 'San Salvador, El Salvador',
  telefono: '2222-3333',
  correo: '',
  aplicaIva: true,
  ivaIncluido: true,
  tasaIva: 13,
});

describe('createCompanyForm', () => {
  it('acepta una empresa completa, con el correo opcional', () => {
    const form = createCompanyForm();
    form.setValue(valid());
    expect(form.valid).toBe(true);
  });

  it('acepta los datos de respaldo (semilla)', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), nit: '0000-000000-000-0', nrc: '000000-0', telefono: '0000-0000' });
    expect(form.valid).toBe(true);
  });

  it('exige los campos y no acepta solo espacios', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), razonSocial: '   ' });
    expect(form.controls.razonSocial.hasError('required')).toBe(true);
    form.setValue({ ...valid(), direccion: '' });
    expect(form.controls.direccion.hasError('required')).toBe(true);
  });

  it('rechaza un NIT sin guiones y acepta el NIT de persona natural (DUI)', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), nit: '06140101901013' });
    expect(form.controls.nit.hasError('nit')).toBe(true);
    form.setValue({ ...valid(), nit: '01234567-8' });
    expect(form.controls.nit.valid).toBe(true);
  });

  it('rechaza un NRC con más de 7 dígitos o sin verificador', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), nrc: '12345678-9' });
    expect(form.controls.nrc.hasError('nrc')).toBe(true);
    form.setValue({ ...valid(), nrc: '123456' });
    expect(form.controls.nrc.hasError('nrc')).toBe(true);
  });

  it('valida teléfono y correo', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), telefono: 'abc', correo: 'sin-arroba' });
    expect(form.controls.telefono.hasError('phone')).toBe(true);
    expect(form.controls.correo.hasError('email')).toBe(true);
  });
});

describe('impuestos del formulario de la empresa', () => {
  it('por defecto aplica IVA, incluido y al 13 %', () => {
    const form = createCompanyForm();
    expect(form.getRawValue()).toMatchObject({ aplicaIva: true, ivaIncluido: true, tasaIva: 13 });
  });

  it('acepta tasas de 0 a 100 con hasta dos decimales', () => {
    const form = createCompanyForm();
    for (const tasaIva of [0, 13, 16.5, 12.25, 100]) {
      form.setValue({ ...valid(), tasaIva });
      expect(form.controls.tasaIva.valid).toBe(true);
    }
  });

  it('rechaza tasas negativas, mayores que 100, con tres decimales o vacías', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), tasaIva: -1 });
    expect(form.controls.tasaIva.hasError('min')).toBe(true);
    form.setValue({ ...valid(), tasaIva: 100.5 });
    expect(form.controls.tasaIva.hasError('max')).toBe(true);
    form.setValue({ ...valid(), tasaIva: 13.005 });
    expect(form.controls.tasaIva.hasError('pattern')).toBe(true);
    form.controls.tasaIva.setValue(null as unknown as number);
    expect(form.controls.tasaIva.hasError('required')).toBe(true);
  });

  it('al no aplicar IVA se deshabilitan el modo y la tasa, y se conserva su valor', () => {
    const form = createCompanyForm();
    form.setValue({ ...valid(), ivaIncluido: false, tasaIva: 16 });
    form.controls.aplicaIva.setValue(false);

    expect(form.controls.ivaIncluido.disabled).toBe(true);
    expect(form.controls.tasaIva.disabled).toBe(true);
    expect(form.valid).toBe(true);
    expect(form.getRawValue()).toMatchObject({ aplicaIva: false, ivaIncluido: false, tasaIva: 16 });

    form.controls.aplicaIva.setValue(true);
    expect(form.controls.ivaIncluido.enabled).toBe(true);
    expect(form.controls.tasaIva.enabled).toBe(true);
  });

  it('un mensaje claro por cada error de la tasa', () => {
    expect(companyErrorMessage({ min: {} })).toContain('negativa');
    expect(companyErrorMessage({ max: {} })).toContain('100');
    expect(companyErrorMessage({ pattern: {} })).toContain('dos decimales');
  });
});

describe('companyErrorMessage', () => {
  it('prioriza el mensaje del servidor', () => {
    expect(companyErrorMessage({ server: 'NIT repetido', required: true })).toBe('NIT repetido');
  });

  it('explica el formato esperado de NIT y NRC', () => {
    expect(companyErrorMessage({ nit: true })).toContain('0000-000000-000-0');
    expect(companyErrorMessage({ nrc: true })).toContain('nnnnnn-n');
  });

  it('sin errores no devuelve mensaje', () => {
    expect(companyErrorMessage(null)).toBeNull();
  });
});
