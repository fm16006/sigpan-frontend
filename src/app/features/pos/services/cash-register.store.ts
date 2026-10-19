import { Injectable, PLATFORM_ID, computed, inject, linkedSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SessionStore } from '../../../core/services/session-store';

export type CashRegisterState = 'cerrada' | 'abierta';

/** Turno abierto en la caja. */
export interface CashShift {
  /** Instante de apertura, ISO 8601. */
  readonly abiertaEn: string;
  /** Efectivo con el que se abrió la gaveta. */
  readonly fondo: number;
  readonly nota: string;
  readonly cajero: string;
}

/** Último turno cerrado, para mostrarlo como "turno anterior" al abrir. */
export interface ClosedShift extends CashShift {
  readonly cerradaEn: string;
  /** Efectivo contado en el arqueo del cierre. */
  readonly contado: number;
}

interface Persisted {
  readonly turno: CashShift | null;
  readonly ultimoCierre: ClosedShift | null;
}

const EMPTY: Persisted = { turno: null, ultimoCierre: null };
const KEY_PREFIX = 'sigpan.caja.';

/**
 * Estado de la caja: cerrada → abierta → cerrada. Mientras está cerrada no se vende.
 * El turno vive en localStorage, separado por usuario (`sigpan.caja.<id o correo>`).
 */
// Provisional hasta HU-38: el backend todavía no guarda turnos; reemplazar por la API.
@Injectable({ providedIn: 'root' })
export class CashRegisterStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly session = inject(SessionStore);

  private readonly key = computed(() => {
    const user = this.session.user();
    const owner = user?.id ?? user?.email;
    return owner == null ? null : `${KEY_PREFIX}${owner}`;
  });

  /** Se vuelve a leer el almacenamiento cuando cambia el usuario de la sesión. */
  private readonly data = linkedSignal<string | null, Persisted>({
    source: this.key,
    computation: (key) => this.read(key),
  });

  readonly turno = computed(() => this.data().turno);
  readonly estado = computed<CashRegisterState>(() => (this.data().turno ? 'abierta' : 'cerrada'));
  readonly ultimoCierre = computed(() => this.data().ultimoCierre);

  /** Abre el turno con el fondo contado. Si ya hay uno abierto no hace nada. */
  abrir(fondo: number, nota: string): void {
    if (this.data().turno) {
      return;
    }
    const turno: CashShift = {
      abiertaEn: new Date().toISOString(),
      fondo,
      nota: nota.trim(),
      cajero: this.session.user()?.name ?? '',
    };
    this.save({ ...this.data(), turno });
  }

  /** Cierra el turno con el efectivo contado y lo deja como último cierre. */
  cerrar(contado: number): void {
    const turno = this.data().turno;
    if (!turno) {
      return;
    }
    const ultimoCierre: ClosedShift = { ...turno, cerradaEn: new Date().toISOString(), contado };
    this.save({ turno: null, ultimoCierre });
  }

  private save(next: Persisted): void {
    this.data.set(next);
    const key = this.key();
    if (!this.isBrowser || key === null) {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Sin almacenamiento (modo privado, cuota llena): el turno sigue en memoria.
    }
  }

  private read(key: string | null): Persisted {
    if (!this.isBrowser || key === null) {
      return EMPTY;
    }
    try {
      const raw = localStorage.getItem(key);
      if (!raw) {
        return EMPTY;
      }
      const parsed = JSON.parse(raw) as Partial<Persisted> | null;
      return {
        turno: isShift(parsed?.turno) ? parsed.turno : null,
        ultimoCierre: isClosed(parsed?.ultimoCierre) ? parsed.ultimoCierre : null,
      };
    } catch {
      return EMPTY;
    }
  }
}

function isShift(value: unknown): value is CashShift {
  const shift = value as Partial<CashShift> | null | undefined;
  return (
    !!shift &&
    typeof shift.abiertaEn === 'string' &&
    typeof shift.fondo === 'number' &&
    typeof shift.nota === 'string' &&
    typeof shift.cajero === 'string'
  );
}

function isClosed(value: unknown): value is ClosedShift {
  const closed = value as Partial<ClosedShift> | null | undefined;
  return isShift(value) && typeof closed?.cerradaEn === 'string' && typeof closed.contado === 'number';
}
