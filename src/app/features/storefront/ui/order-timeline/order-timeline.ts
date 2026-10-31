import { Component, computed, input } from '@angular/core';
import { DatePipe } from '@angular/common';
import { ORDER_STATUS_LABELS, Sale } from '../../../../core/models/order.model';

/** HU-42: línea de tiempo con fecha y hora de cada cambio de estado. */
@Component({
  selector: 'app-order-timeline',
  imports: [DatePipe],
  template: `
    <ol class="grid gap-3 border-s-2 border-base-300 ps-4">
      @for (step of steps(); track step.id; let last = $last) {
        <li class="relative">
          <span
            class="absolute -start-[1.4rem] top-1 size-3 rounded-full"
            [class]="last ? 'bg-primary' : 'bg-base-300'"
            aria-hidden="true"
          ></span>
          <p class="text-sm font-medium">{{ labels[step.estado] ?? step.estado }}</p>
          <p class="text-xs text-base-content/55">{{ step.fecha | date: 'd/M/yy, h:mm a' }}</p>
        </li>
      }
    </ol>
  `,
})
export class OrderTimeline {
  readonly order = input.required<Sale>();

  protected readonly labels = ORDER_STATUS_LABELS;
  protected readonly steps = computed(() => this.order().historial ?? []);
}
