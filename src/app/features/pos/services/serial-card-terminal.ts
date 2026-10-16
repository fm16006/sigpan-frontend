import { Injectable, OnDestroy, signal } from '@angular/core';
import { Observable, Subject, filter, firstValueFrom, timeout } from 'rxjs';
import { CardRead } from '../models/checkout.model';
import {
  CardTerminalError,
  TerminalEvent,
  parseTerminalLine,
  terminalErrorCode,
} from '../payment/terminal-protocol';
import { CardTerminal, TerminalStatus } from './card-terminal';

// Tipos mínimos de Web Serial (TypeScript no los incluye en lib.dom).
interface SerialPortLike extends EventTarget {
  readonly readable: ReadableStream<Uint8Array> | null;
  readonly writable: WritableStream<Uint8Array> | null;
  open(options: { baudRate: number }): Promise<void>;
  close(): Promise<void>;
}

interface SerialLike {
  getPorts(): Promise<SerialPortLike[]>;
  requestPort(options?: { filters: { usbVendorId: number }[] }): Promise<SerialPortLike>;
}

function webSerial(): SerialLike | null {
  return typeof navigator !== 'undefined' && 'serial' in navigator
    ? (navigator as Navigator & { serial: SerialLike }).serial
    : null;
}

const BAUD_RATE = 115_200;
// Arduino original y los clones con CH340.
const USB_VENDORS = [{ usbVendorId: 0x2341 }, { usbVendorId: 0x1a86 }];
// El UNO se reinicia al abrir el puerto; el bootloader tarda ~1.5 s antes de "listo".
const BOOT_WAIT_MS = 2_500;
const PING_WAIT_MS = 2_000;
// Tiempo para que el Arduino confirme COBRAR con "esperando".
const ACK_WAIT_MS = 2_000;

@Injectable()
export class SerialCardTerminal extends CardTerminal implements OnDestroy {
  private readonly state = signal<TerminalStatus>('desconectado');
  readonly status = this.state.asReadonly();

  private readonly events = new Subject<TerminalEvent>();
  private readonly encoder = new TextEncoder();
  private port: SerialPortLike | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private reading: Promise<void> | null = null;

  async connect(): Promise<void> {
    const serial = webSerial();
    if (!serial) {
      throw new CardTerminalError('NO_SOPORTADO');
    }
    if (this.state() !== 'desconectado') {
      return;
    }

    this.state.set('conectando');
    try {
      const port = await this.choosePort(serial);
      await port.open({ baudRate: BAUD_RATE }).catch(() => {
        throw new CardTerminalError('PUERTO_OCUPADO');
      });
      this.port = port;
      port.addEventListener('disconnect', () => this.lost(port));
      this.reading = this.readLoop(port);

      await this.waitUntilReady();
      this.state.set('conectado');
    } catch (error) {
      await this.disconnect();
      throw error instanceof CardTerminalError ? error : new CardTerminalError('DESCONOCIDO');
    }
  }

  charge(amount: number): Observable<CardRead> {
    return new Observable<CardRead>((subscriber) => {
      let finished = false;
      const fail = (error: CardTerminalError) => {
        finished = true;
        subscriber.error(error);
      };
      let ack: ReturnType<typeof setTimeout> | undefined = setTimeout(
        () => fail(new CardTerminalError('SIN_RESPUESTA')),
        ACK_WAIT_MS,
      );

      const subscription = this.events.subscribe((event) => {
        switch (event.evento) {
          case 'esperando':
            clearTimeout(ack);
            ack = undefined;
            break;
          case 'tarjeta':
            finished = true;
            subscriber.next({ uid: event.uid, tipo: event.tipo });
            subscriber.complete();
            break;
          case 'timeout':
            fail(new CardTerminalError('TIEMPO_AGOTADO'));
            break;
          case 'desconectado':
            fail(new CardTerminalError('DESCONECTADO'));
            break;
          case 'error':
            fail(new CardTerminalError(terminalErrorCode(event.codigo)));
            break;
        }
      });

      this.send(`COBRAR ${amount.toFixed(2)}`).catch(() =>
        fail(new CardTerminalError('DESCONECTADO')),
      );

      return () => {
        clearTimeout(ack);
        subscription.unsubscribe();
        if (!finished) {
          this.send('CANCELAR').catch(() => undefined);
        }
      };
    });
  }

  async disconnect(): Promise<void> {
    const port = this.port;
    this.port = null;
    this.state.set('desconectado');
    await this.reader?.cancel().catch(() => undefined);
    await this.reading;
    await port?.close().catch(() => undefined);
  }

  ngOnDestroy(): void {
    void this.disconnect();
  }

  private async choosePort(serial: SerialLike): Promise<SerialPortLike> {
    // Un puerto ya autorizado se reutiliza sin volver a mostrar el selector.
    const [known] = await serial.getPorts();
    if (known) {
      return known;
    }
    return serial.requestPort({ filters: USB_VENDORS }).catch(() => {
      throw new CardTerminalError('SIN_PUERTO');
    });
  }

  private async waitUntilReady(): Promise<void> {
    const ready = (ms: number) =>
      firstValueFrom(
        this.events.pipe(
          filter((event) => ['listo', 'pong', 'error', 'desconectado'].includes(event.evento)),
          timeout(ms),
        ),
      );

    // No se envía nada durante el arranque: el bootloader podría quedarse esperando.
    const event = await ready(BOOT_WAIT_MS)
      .catch(async () => {
        // Se escucha antes de enviar para no perder un "pong" muy rápido.
        const pong = ready(PING_WAIT_MS);
        await this.send('PING');
        return pong;
      })
      .catch(() => {
        throw new CardTerminalError('SIN_RESPUESTA');
      });

    if (event.evento === 'error') {
      throw new CardTerminalError(terminalErrorCode(event.codigo));
    }
    if (event.evento === 'desconectado') {
      throw new CardTerminalError('DESCONECTADO');
    }
  }

  private async readLoop(port: SerialPortLike): Promise<void> {
    const decoder = new TextDecoder();
    let pending = '';

    while (this.port === port && port.readable) {
      const reader = port.readable.getReader();
      this.reader = reader;
      try {
        for (;;) {
          const { value, done } = await reader.read();
          if (done) {
            break;
          }
          pending += decoder.decode(value, { stream: true });
          const lines = pending.split('\n');
          pending = lines.pop() ?? '';
          for (const line of lines) {
            const event = parseTerminalLine(line);
            if (event) {
              this.events.next(event);
            }
          }
        }
      } catch {
        // Error de lectura (ruido o cable retirado): si el puerto sigue abierto se reintenta.
      } finally {
        reader.releaseLock();
        this.reader = null;
      }
    }

    if (this.port === port) {
      this.lost(port);
    }
  }

  private lost(port: SerialPortLike): void {
    if (this.port !== port) {
      return;
    }
    this.events.next({ evento: 'desconectado' });
    void this.disconnect();
  }

  private async send(command: string): Promise<void> {
    const writer = this.port?.writable?.getWriter();
    if (!writer) {
      throw new CardTerminalError('DESCONECTADO');
    }
    try {
      await writer.write(this.encoder.encode(`${command}\n`));
    } finally {
      writer.releaseLock();
    }
  }
}
