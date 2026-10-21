import { Injectable, inject } from '@angular/core';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';

/** Cajas del punto de venta. */
@Injectable({ providedIn: 'root' })
export class RegisterService {
  private readonly api = inject(ApiClient);

  /** Sucursal de la panadería con sus cajas activas (`GET /sucursales/mi-sucursal`). */
  registersUrl(): string {
    return this.api.url(API_ENDPOINTS.sucursales.mine);
  }
}
