import { Injectable, signal } from '@angular/core';

export type NoticeKind = 'success' | 'error' | 'info';

export interface Notice {
  readonly id: number;
  readonly kind: NoticeKind;
  readonly text: string;
}

const AUTO_DISMISS_MS = 5_000;

/** Cola de avisos. La pinta ToastHost, declarado una sola vez en la raíz. */
@Injectable({ providedIn: 'root' })
export class Notifications {
  private readonly queue = signal<readonly Notice[]>([]);
  private nextId = 0;

  readonly notices = this.queue.asReadonly();

  success(text: string): void {
    this.push('success', text);
  }

  error(text: string): void {
    this.push('error', text);
  }

  info(text: string): void {
    this.push('info', text);
  }

  dismiss(id: number): void {
    this.queue.update((notices) => notices.filter((notice) => notice.id !== id));
  }

  private push(kind: NoticeKind, text: string): void {
    const id = this.nextId++;
    this.queue.update((notices) => [...notices, { id, kind, text }]);
    setTimeout(() => this.dismiss(id), AUTO_DISMISS_MS);
  }
}
