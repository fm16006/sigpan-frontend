import { FormBuilder, NonNullableFormBuilder, Validators } from '@angular/forms';

export const SUPPLIER_NAME_MAX = 150;
export const SUPPLIER_PHONE_MAX = 30;
export const SUPPLIER_NIT_MAX = 30;

/** Formulario de proveedor. Se separa del componente para poder probarlo sin TestBed. */
export function createSupplierForm(fb: NonNullableFormBuilder = new FormBuilder().nonNullable) {
  return fb.group({
    nombre: ['', [Validators.required, Validators.maxLength(SUPPLIER_NAME_MAX)]],
    contacto: ['', [Validators.required, Validators.maxLength(SUPPLIER_NAME_MAX)]],
    telefono: ['', [Validators.required, Validators.maxLength(SUPPLIER_PHONE_MAX)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(SUPPLIER_NAME_MAX)]],
    nit: ['', [Validators.maxLength(SUPPLIER_NIT_MAX)]],
  });
}
