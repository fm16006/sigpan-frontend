import { FormControl } from '@angular/forms';
import { describe, expect, it } from 'vitest';
import { passwordPolicy } from './password-policy';

describe('passwordPolicy', () => {
  const errors = (value: string) => passwordPolicy(new FormControl(value, { nonNullable: true }));

  it('acepta mayúscula, minúscula y número', () => {
    expect(errors('Pan12345')).toBeNull();
  });

  it('deja el campo vacío a required', () => {
    expect(errors('')).toBeNull();
  });

  it.each(['pan12345', 'PAN12345', 'Panpanpan'])('rechaza %s', (value) => {
    expect(errors(value)).toEqual({ passwordPolicy: true });
  });
});
