import { createProductForm } from './product-form';

const valid = () => ({
  codigo: 'PF-001',
  nombre: 'Pan francés',
  descripcion: '',
  precio: 0.25,
  categoriaId: 1,
  stockMinimo: 10,
  unidadVenta: 'unidad',
  tipo: 'ELABORADO' as const,
  especialidad: 'PAN_FRANCES' as const,
  alergenos: '',
});

describe('createProductForm', () => {
  it('acepta un producto completo', () => {
    const form = createProductForm();
    form.setValue(valid());
    expect(form.valid).toBe(true);
  });

  it('exige el código', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), codigo: '' });
    expect(form.controls.codigo.hasError('required')).toBe(true);
  });

  it('exige la especialidad', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), especialidad: '' });
    expect(form.controls.especialidad.hasError('required')).toBe(true);
  });

  it('exige la unidad de venta', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), unidadVenta: '' });
    expect(form.controls.unidadVenta.hasError('required')).toBe(true);
  });

  it('deja los alérgenos como campo opcional', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), alergenos: '' });
    expect(form.controls.alergenos.valid).toBe(true);
  });

  it('limita el código a 30 caracteres', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), codigo: 'X'.repeat(31) });
    expect(form.controls.codigo.hasError('maxlength')).toBe(true);
  });
});
