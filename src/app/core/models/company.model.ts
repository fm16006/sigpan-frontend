import { BUSINESS_INFO, BusinessInfo } from '../config/business.config';

/** Datos de la empresa tal como los devuelve `GET /empresa`. */
export interface Company {
  readonly razonSocial: string;
  readonly nombreComercial: string;
  readonly nit: string;
  readonly nrc: string;
  readonly giro: string;
  readonly direccion: string;
  readonly telefono: string;
  readonly correo: string | null;
  readonly logoUrl: string | null;
  readonly actualizadoEn: string | null;
}

/** Lo que se envía en `PUT /empresa` (el logo va por su propio endpoint). */
export type CompanyDraft = Omit<Company, 'logoUrl' | 'actualizadoEn'>;

/**
 * Datos del negocio para el ticket, el pie de la tienda, etc.: los de la empresa si ya
 * llegaron del API; si no (cargando o con error), los de `BUSINESS_INFO`, para que la
 * aplicación nunca quede sin nombre ni encabezado de ticket. `caja` y `horario` no son
 * datos de la empresa y siempre salen de `BUSINESS_INFO`.
 */
export function toBusinessInfo(company: Company | null): BusinessInfo {
  if (!company) {
    return BUSINESS_INFO;
  }
  return {
    ...BUSINESS_INFO,
    nombreComercial: company.nombreComercial,
    razonSocial: company.razonSocial,
    giro: company.giro,
    direccion: company.direccion,
    nit: company.nit,
    nrc: company.nrc,
    telefono: company.telefono,
    correo: company.correo,
    logoUrl: company.logoUrl,
  };
}
