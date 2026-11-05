import { Routes } from '@angular/router';
import { CardTerminal } from './services/card-terminal';
import { SerialCardTerminal } from './services/serial-card-terminal';
import { SimulatedTicketPrinter, TicketPrinter } from './services/ticket-printer';

export const POS_ROUTES: Routes = [
  {
    path: '',
    providers: [
      { provide: TicketPrinter, useClass: SimulatedTicketPrinter },
      { provide: CardTerminal, useClass: SerialCardTerminal },
    ],
    loadComponent: () => import('./pages/pos-screen/pos-screen').then((m) => m.PosScreen),
    title: 'Punto de venta',
  },
];
