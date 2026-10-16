export interface BusinessInfo {
  readonly nombreComercial: string;
  readonly razonSocial: string;
  readonly giro: string;
  readonly direccion: string;
  readonly nit: string;
  readonly nrc: string;
  readonly telefono: string;
  readonly caja: string;
  /** Horario que se muestra en la tienda en línea. */
  readonly horario: readonly { readonly dias: string; readonly horas: string }[];
}

export const BUSINESS_INFO: BusinessInfo = {
  nombreComercial: 'Panadería SigPan',
  razonSocial: 'SigPan, S.A. de C.V.',
  giro: 'Elaboración y venta de pan',
  direccion: 'San Salvador, El Salvador',
  nit: '0000-000000-000-0',
  nrc: '000000-0',
  telefono: '0000-0000',
  caja: '01',
  horario: [
    { dias: 'Lunes a viernes', horas: '6:00 a. m. – 7:00 p. m.' },
    { dias: 'Sábado', horas: '6:00 a. m. – 6:00 p. m.' },
    { dias: 'Domingo', horas: '7:00 a. m. – 12:00 m.' },
  ],
};
