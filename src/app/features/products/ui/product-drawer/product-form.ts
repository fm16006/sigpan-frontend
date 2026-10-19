import { FormBuilder, NonNullableFormBuilder, Validators } from '@angular/forms';
import { Especialidad } from '../../../../core/models/catalog.model';

export const PRODUCT_CODE_MAX = 30;
export const PRODUCT_UNIT_MAX = 30;
export const PRODUCT_ALLERGENS_MAX = 255;

/** Formulario de producto. Se separa del componente para poder probarlo sin TestBed. */
export function createProductForm(
  fb: NonNullableFormBuilder = new FormBuilder().nonNullable,
) {
  return fb.group({
    codigo: ['', [Validators.required, Validators.maxLength(PRODUCT_CODE_MAX)]],
    nombre: ['', [Validators.required, Validators.minLength(3)]],
    descripcion: [''],
    precio: [0, [Validators.required, Validators.min(0.01)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    stockMinimo: [0, [Validators.required, Validators.min(0)]],
    unidadVenta: ['', [Validators.required, Validators.maxLength(PRODUCT_UNIT_MAX)]],
    especialidad: ['' as Especialidad | '', [Validators.required]],
    alergenos: ['', [Validators.maxLength(PRODUCT_ALLERGENS_MAX)]],
  });
}
