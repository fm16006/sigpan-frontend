import { Component, inject } from '@angular/core';
import { Notifications } from '../../../core/services/notifications';

/** Se declara una sola vez en la raíz. */
@Component({
  selector: 'app-toast-host',
  template: `
    <div class="toast toast-end z-50">
      @for (notice of notifications.notices(); track notice.id) {
        <div
          class="alert text-sm shadow-lg"
          [class.alert-success]="notice.kind === 'success'"
          [class.alert-error]="notice.kind === 'error'"
          [class.alert-info]="notice.kind === 'info'"
          role="status"
        >
          <span>{{ notice.text }}</span>
          <button
            type="button"
            class="btn btn-ghost btn-xs"
            aria-label="Cerrar aviso"
            (click)="notifications.dismiss(notice.id)"
          >
            ✕
          </button>
        </div>
      }
    </div>
  `,
})
export class ToastHost {
  protected readonly notifications = inject(Notifications);
}
