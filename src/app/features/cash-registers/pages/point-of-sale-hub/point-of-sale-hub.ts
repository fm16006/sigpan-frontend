import { Component, inject } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Auth } from '../../../../core/services/auth';
import { DetailHeader, DetailTab } from '../../../../shared/ui/detail-header/detail-header';

/**
 * Punto de venta en el panel: lo que pasa en las cajas sin entrar a cobrar. Cada pestaña es una
 * ruta hija; la caja de pantalla completa queda a un botón para quien cobra.
 */
@Component({
  selector: 'app-point-of-sale-hub',
  imports: [DetailHeader, RouterLink, RouterOutlet],
  template: `
    <app-detail-header [crumbs]="crumbs" title="Punto de venta" [tabs]="tabs">
      @if (canSell) {
        <a actions routerLink="/backoffice/pos" class="btn btn-primary">Ir a la caja</a>
      }
    </app-detail-header>
    <router-outlet />
  `,
})
export class PointOfSaleHub {
  protected readonly crumbs = [{ label: 'Ventas' }, { label: 'Punto de venta' }];
  protected readonly tabs: readonly DetailTab[] = [
    { label: 'Cajas', path: '' },
    { label: 'Ventas y pedidos', path: 'ventas' },
    { label: 'Cortes', path: 'cortes' },
  ];
  /** El auditor consulta; solo quien cobra entra a la caja. */
  protected readonly canSell = inject(Auth).hasAnyRole(['ADMINISTRADOR', 'CAJERO']);
}
