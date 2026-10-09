import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { RouterLink } from '@angular/router';

interface Highlight {
  readonly title: string;
  readonly text: string;
}

@Component({
  selector: 'app-home',
  imports: [RouterLink, NgOptimizedImage],
  templateUrl: './home.html',
})
export class Home {
  protected readonly highlights: readonly Highlight[] = [
    {
      title: 'Masa madre de 24 horas',
      text: 'Fermentación lenta para una miga alveolada y una corteza que cruje.',
    },
    {
      title: 'Horneado cada mañana',
      text: 'Pedí antes de las 7:00 a. m. y lo retirás recién salido del horno.',
    },
    {
      title: 'Trazabilidad de insumos',
      text: 'Cada receta descuenta inventario, así que el stock siempre está al día.',
    },
  ];
}
