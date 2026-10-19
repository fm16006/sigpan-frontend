import { Injectable, PLATFORM_ID, computed, inject, linkedSignal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { SessionStore } from '../../../core/services/session-store';
import { PosLine } from '../models/checkout.model';
import {
  PosOrdersState,
  activeOrder,
  addOrder,
  canAddOrder,
  cycleOrder,
  initialOrders,
  parseOrders,
  pendingOrders,
  removeOrder,
  setOrderLines,
  setOrderTotal,
  switchOrder,
} from '../pos-orders';

const KEY_PREFIX = 'sigpan.pedidos.';

/**
 * Pedidos en espera de la caja: el cajero puede tener varios tickets abiertos y atender
 * al siguiente. Viven en localStorage, separados por usuario (`sigpan.pedidos.<id o correo>`),
 * para que ir al panel y volver no los pierda.
 */
// Provisional: los pedidos en espera viven en este navegador.
@Injectable({ providedIn: 'root' })
export class PosOrdersStore {
  private readonly isBrowser = isPlatformBrowser(inject(PLATFORM_ID));
  private readonly session = inject(SessionStore);

  private readonly key = computed(() => {
    const user = this.session.user();
    const owner = user?.id ?? user?.email;
    return owner == null ? null : `${KEY_PREFIX}${owner}`;
  });

  /** Se vuelve a leer el almacenamiento cuando cambia el usuario de la sesión. */
  private readonly data = linkedSignal<string | null, PosOrdersState>({
    source: this.key,
    computation: (key) => this.read(key),
  });

  readonly pedidos = computed(() => this.data().orders);
  readonly activo = computed(() => activeOrder(this.data()));
  readonly activoId = computed(() => this.activo().id);
  /** Líneas del pedido activo: el ticket sobre el que opera la pantalla. */
  readonly lineas = computed(() => this.activo().lines);
  /** Pedidos con algo cargado, que se perderían sin cobrar. */
  readonly pendientes = computed(() => pendingOrders(this.data()));
  readonly puedeCrear = computed(() => canAddOrder(this.data()));

  /** Abre un pedido vacío y lo activa. Devuelve false si ya está el máximo. */
  crear(): boolean {
    if (!canAddOrder(this.data())) {
      return false;
    }
    this.update((state) => addOrder(state, new Date().toISOString()));
    return true;
  }

  cambiar(id: number): void {
    this.update((state) => switchOrder(state, id));
  }

  /** Siguiente (1) o anterior (−1) pedido, dando la vuelta. */
  ciclar(step = 1): void {
    this.update((state) => cycleOrder(state, step));
  }

  /** Quita un pedido (cobrado o descartado); si era el último, deja uno vacío. */
  quitar(id: number): void {
    this.update((state) => removeOrder(state, id, new Date().toISOString()));
  }

  /** Cambia las líneas del pedido activo. */
  cambiarLineas(update: (lines: readonly PosLine[]) => readonly PosLine[]): void {
    this.update((state) => {
      const order = activeOrder(state);
      return setOrderLines(state, order.id, update(order.lines));
    });
  }

  guardarTotal(id: number, total: number): void {
    this.update((state) => setOrderTotal(state, id, total));
  }

  /** Descarta todos los pedidos (cierre de caja) y deja uno vacío. */
  reiniciar(): void {
    this.update(() => initialOrders(new Date().toISOString()));
  }

  private update(change: (state: PosOrdersState) => PosOrdersState): void {
    const current = this.data();
    const next = change(current);
    if (next === current) {
      return;
    }
    this.data.set(next);
    const key = this.key();
    if (!this.isBrowser || key === null) {
      return;
    }
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      // Sin almacenamiento (modo privado, cuota llena): los pedidos siguen en memoria.
    }
  }

  private read(key: string | null): PosOrdersState {
    const fresh = () => initialOrders(new Date().toISOString());
    if (!this.isBrowser || key === null) {
      return fresh();
    }
    try {
      const raw = localStorage.getItem(key);
      return (raw ? parseOrders(JSON.parse(raw)) : null) ?? fresh();
    } catch {
      return fresh();
    }
  }
}
