import { Pipe, PipeTransform } from '@angular/core';

/** Un solo formateador: instanciarlo es costoso y la pipe corre en cada celda. */
@Pipe({ name: 'money' })
export class MoneyPipe implements PipeTransform {
  private static readonly formatter = new Intl.NumberFormat('es-SV', {
    style: 'currency',
    currency: 'USD',
  });

  transform(value: number | null | undefined): string {
    return MoneyPipe.formatter.format(value ?? 0);
  }
}
