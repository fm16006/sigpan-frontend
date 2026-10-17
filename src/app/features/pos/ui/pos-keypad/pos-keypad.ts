import { Component, output } from '@angular/core';

export type KeypadKey = '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '.' | 'back';

const MAX_LENGTH = 8;

export function applyKeypadKey(value: string, key: KeypadKey): string {
  if (key === 'back') return value.slice(0, -1);
  if (key === '.' && value.includes('.')) return value;
  if (value.length >= MAX_LENGTH) return value;
  return value === '0' && key !== '.' ? key : value + key;
}

@Component({
  selector: 'app-pos-keypad',
  template: `
    <div class="grid grid-cols-3 gap-1.5" role="group" aria-label="Teclado numérico">
      @for (key of keys; track key) {
        <button
          type="button"
          class="btn btn-lg font-mono text-lg"
          [attr.aria-label]="key === 'back' ? 'Borrar dígito' : key"
          (click)="pressed.emit(key)"
        >
          {{ key === 'back' ? '⌫' : key }}
        </button>
      }
    </div>
  `,
})
export class PosKeypad {
  protected readonly keys: readonly KeypadKey[] = [
    '7',
    '8',
    '9',
    '4',
    '5',
    '6',
    '1',
    '2',
    '3',
    '.',
    '0',
    'back',
  ];

  readonly pressed = output<KeypadKey>();
}
