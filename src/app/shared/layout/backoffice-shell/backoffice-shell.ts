import { Component, HostListener, computed, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { BackofficeSidebar } from '../backoffice-sidebar/backoffice-sidebar';
import { BackofficeHeader } from '../backoffice-header/backoffice-header';
import { Auth } from '../../../core/services/auth';

@Component({
  selector: 'app-backoffice-shell',
  imports: [RouterOutlet, BackofficeSidebar, BackofficeHeader],
  templateUrl: './backoffice-shell.html',
  styles: ``,
})
export class BackofficeShell {
  private auth = inject(Auth);

  protected isKioskMode = computed(
    () => this.auth.hasAnyRole(['CASHIER']) && !this.auth.hasAnyRole(['ADMIN'])
  );

  // Bloquea el clic derecho solo en modo quiosco (evita inspeccionar/ver código fácil)
  @HostListener('document:contextmenu', ['$event'])
  onRightClick(event: MouseEvent): void {
    if (this.isKioskMode()) {
      event.preventDefault();
    }
  }

  // Advierte antes de recargar/cerrar por accidente, solo en modo quiosco
  @HostListener('window:beforeunload', ['$event'])
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (this.isKioskMode()) {
      event.preventDefault();
    }
  }
}