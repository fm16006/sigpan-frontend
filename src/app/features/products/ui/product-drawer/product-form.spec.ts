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
  disponiblePos: true,
  disponibleTienda: true,
  exentoIva: false,
  anticipacionHoras: null as number | null,
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

  it('un producto nuevo parte habilitado en el punto de venta y en la tienda en línea', () => {
    const form = createProductForm();
    expect(form.controls.disponiblePos.value).toBe(true);
    expect(form.controls.disponibleTienda.value).toBe(true);
  });

  it('un producto nuevo lleva IVA y se puede marcar como exento', () => {
    const form = createProductForm();
    expect(form.controls.exentoIva.value).toBe(false);
    form.setValue({ ...valid(), exentoIva: true });
    expect(form.valid).toBe(true);
    expect(form.getRawValue().exentoIva).toBe(true);
  });

  it('cada canal se puede apagar sin afectar al otro ni la validez del formulario', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), disponiblePos: false });
    expect(form.valid).toBe(true);
    expect(form.getRawValue().disponiblePos).toBe(false);
    expect(form.getRawValue().disponibleTienda).toBe(true);
  });

  it('limita el código a 30 caracteres', () => {
    const form = createProductForm();
    form.setValue({ ...valid(), codigo: 'X'.repeat(31) });
    expect(form.controls.codigo.hasError('maxlength')).toBe(true);
  });
});
