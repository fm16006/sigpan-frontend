import { Component, input, output } from '@angular/core';
import { EmptyState } from '../empty-state/empty-state';

/** Estados de carga, error y sin datos, para no repetirlos en cada pantalla. */
@Component({
  selector: 'app-resource-state',
  imports: [EmptyState],
  template: `
    @if (loading()) {
      <div class="grid gap-3" aria-busy="true" aria-live="polite">
        @for (row of skeletonRows(); track row) {
          <div class="h-16 animate-pulse rounded-box bg-base-200"></div>
        }
      </div>
    } @else if (failed()) {
      <div role="alert" class="alert alert-error">
        <span>No pudimos cargar la información.</span>
        <button type="button" class="btn btn-sm" (click)="retry.emit()">Reintentar</button>
      </div>
    } @else if (empty()) {
      <app-empty-state [title]="emptyTitle()" [description]="emptyDescription()" />
    } @else {
      <ng-content />
    }
  `,
})
export class ResourceState {
  readonly loading = input(false);
  readonly failed = input(false);
  readonly empty = input(false);
  readonly emptyTitle = input('Sin resultados');
  readonly emptyDescription = input<string>();
  readonly skeletonCount = input(4);

  readonly retry = output<void>();

  protected skeletonRows(): readonly number[] {
    return Array.from({ length: this.skeletonCount() }, (_, index) => index);
  }
}
