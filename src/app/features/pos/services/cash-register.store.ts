import { Injectable, PLATFORM_ID, computed, effect, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap } from 'rxjs';
import { API_ENDPOINTS } from '../../../core/constants/api-endpoints';
import { ApiClient } from '../../../core/http/api-client';
import { CashShift as ServerShift } from '../../../core/models/order.model';
import { SessionStore } from '../../../core/services/session-store';
import { todayIso } from '../../../core/utils/dates';

export type CashRegisterState = 'cerrada' | 'abierta';

/** Caja donde se abrió el turno. */
export interface ShiftPlace {
  readonly cajaId: number | null;
  readonly caja: string;
}

/** Turno abierto en la caja. */
export interface CashShift {
  readonly id: number;
  /** Instante de apertura, ISO 8601. */
  readonly abiertaEn: string;
  /** Efectivo con el que se abrió la gaveta. */
  readonly fondo: number;
  readonly nota: string;
  readonly cajero: string;
  readonly lugar?: ShiftPlace;
  /** Efectivo neto de las ventas del turno (recibido menos cambio). */
  readonly efectivoVentas: number;
  readonly tarjetaVentas: number;
  readonly cantidadVentas: number;
  /** Fondo más efectivo de las ventas. */
  readonly esperado: number;
}

/** Último turno cerrado, para mostrarlo como "turno anterior" al abrir. */
export interface ClosedShift extends CashShift {
  readonly cerradaEn: string;
  /** Efectivo contado en el arqueo del cierre. */
  readonly contado: number;
  /** Contado menos esperado; negativo es faltante. */
  readonly diferencia: number;
}

/** HU-38: estado de la caja según el turno abierto del cajero en el servidor. */
@Injectable({ providedIn: 'root' })
export class CashRegisterStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly session = inject(SessionStore);
  private readonly api = inject(ApiClient);
  private readonly http = inject(HttpClient);

  private readonly abierto = signal<ServerShift | null>(null);
  private readonly cerrado = signal<ServerShift | null>(null);
  readonly cargando = signal(false);

  readonly turno = computed(() => toShift(this.abierto()));
  readonly estado = computed<CashRegisterState>(() => (this.abierto() ? 'abierta' : 'cerrada'));
  readonly ultimoCierre = computed(() => toClosed(this.cerrado()));
  readonly lugar = computed(() => this.turno()?.lugar ?? null);

  constructor() {
    effect(() => {
      if (this.isBrowser && this.session.user()) {
        this.refrescar();
      } else {
        this.abierto.set(null);
        this.cerrado.set(null);
      }
    });
  }

  /** Vuelve a leer el turno abierto (y el último cierre del día) del servidor. */
  refrescar(): void {
    this.cargando.set(true);
    this.http.get<ServerShift | null>(this.api.url(API_ENDPOINTS.turnos.actual)).subscribe({
      next: (turno) => {
        this.abierto.set(turno ?? null);
        this.cargando.set(false);
      },
      error: () => this.cargando.set(false),
    });
    this.api.get<ServerShift[]>(API_ENDPOINTS.turnos.root, { fecha: todayIso() }).subscribe({
      next: (turnos) => this.cerrado.set(turnos.find((t) => t.estado === 'CERRADO') ?? null),
      error: () => this.cerrado.set(null),
    });
  }

  /** Abre el turno con el fondo contado en la caja elegida. */
  abrir(fondo: number, _nota: string, lugar?: ShiftPlace): Observable<void> {
    return this.api
      .post<ServerShift>(API_ENDPOINTS.turnos.abrir, { cajaId: lugar?.cajaId ?? undefined, fondoInicial: fondo })
      .pipe(
        tap((turno) => this.abierto.set(turno)),
        map(() => undefined),
      );
  }

  /** Cierra el turno con el efectivo contado; el servidor calcula esperado y diferencia. */
  cerrar(contado: number, observacion?: string): Observable<ClosedShift> {
    const turno = this.abierto();
    if (!turno) {
      throw new Error('No hay turno abierto.');
    }
    return this.api
      .post<ServerShift>(API_ENDPOINTS.turnos.cerrar(turno.id), { efectivoContado: contado, observacion })
      .pipe(
        tap((cerrado) => {
          this.abierto.set(null);
          this.cerrado.set(cerrado);
        }),
        map((cerrado) => toClosed(cerrado)!),
      );
  }
}

function toShift(turno: ServerShift | null): CashShift | null {
  if (!turno) {
    return null;
  }
  return {
    id: Number(turno.id),
    abiertaEn: turno.apertura,
    fondo: Number(turno.fondoInicial),
    nota: turno.observacion ?? '',
    cajero: turno.usuario,
    lugar: { cajaId: Number(turno.cajaId), caja: turno.caja },
    efectivoVentas: Number(turno.efectivoVentas),
    tarjetaVentas: Number(turno.tarjetaVentas),
    cantidadVentas: turno.cantidadVentas,
    esperado: Number(turno.efectivoEsperado),
  };
}

function toClosed(turno: ServerShift | null): ClosedShift | null {
  const shift = toShift(turno);
  if (!shift || !turno?.cierre) {
    return null;
  }
  return {
    ...shift,
    cerradaEn: turno.cierre,
    contado: Number(turno.efectivoContado ?? 0),
    diferencia: Number(turno.diferencia ?? 0),
  };
}
