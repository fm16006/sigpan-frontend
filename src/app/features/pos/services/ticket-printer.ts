import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export abstract class TicketPrinter {
  abstract print(lines: readonly string[]): Observable<string>;
}

const LINE_DELAY_MS = 140;

@Injectable()
export class SimulatedTicketPrinter extends TicketPrinter {
  print(lines: readonly string[]): Observable<string> {
    return new Observable<string>((subscriber) => {
      let index = 0;
      const interval = setInterval(() => {
        if (index >= lines.length) {
          subscriber.complete();
          return;
        }
        subscriber.next(lines[index++]);
      }, LINE_DELAY_MS);
      return () => clearInterval(interval);
    });
  }
}
