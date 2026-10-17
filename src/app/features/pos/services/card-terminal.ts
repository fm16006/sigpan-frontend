import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { CardRead } from '../models/checkout.model';

export type TerminalStatus = 'desconectado' | 'conectando' | 'conectado';

export abstract class CardTerminal {
  abstract readonly status: Signal<TerminalStatus>;
  abstract connect(): Promise<void>;
  /** Espera una tarjeta por el monto; emite una sola lectura. Desuscribirse cancela el cobro. */
  abstract charge(amount: number): Observable<CardRead>;
}
