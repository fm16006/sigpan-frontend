import { createSupplierForm } from './supplier-form';

const valid = () => ({
  nombre: 'Molinos del Sur',
  contacto: 'Ana Pérez',
  telefono: '2222-0000',
  email: 'ventas@molinos.com',
  nit: '',
});

describe('createSupplierForm', () => {
  it('acepta un proveedor sin NIT', () => {
    const form = createSupplierForm();
    form.setValue(valid());
    expect(form.valid).toBe(true);
  });

  it('exige nombre, contacto, teléfono y correo', () => {
    const form = createSupplierForm();
    form.setValue({ ...valid(), nombre: '', contacto: '', telefono: '', email: '' });
    expect(form.controls.nombre.hasError('required')).toBe(true);
    expect(form.controls.contacto.hasError('required')).toBe(true);
    expect(form.controls.telefono.hasError('required')).toBe(true);
    expect(form.controls.email.hasError('required')).toBe(true);
  });

  it('valida el formato del correo', () => {
    const form = createSupplierForm();
    form.setValue({ ...valid(), email: 'no-es-un-correo' });
    expect(form.controls.email.hasError('email')).toBe(true);
  });

  it('limita el NIT a 30 caracteres', () => {
    const form = createSupplierForm();
    form.setValue({ ...valid(), nit: '1'.repeat(31) });
    expect(form.controls.nit.hasError('maxlength')).toBe(true);
  });
});
