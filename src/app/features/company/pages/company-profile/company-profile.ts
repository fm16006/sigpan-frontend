import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { IMAGE_TYPES, MAX_IMAGE_MB } from '../../../../core/models/catalog.model';
import { CompanyStore } from '../../../../core/services/company-store';
import { Notifications } from '../../../../core/services/notifications';
import { taxExample, taxRateLabel } from '../../../../core/models/tax.model';
import { StatusChip } from '../../../../shared/ui/status-chip/status-chip';
import { Crumb } from '../../../../shared/ui/breadcrumbs/breadcrumbs';
import { DetailHeader } from '../../../../shared/ui/detail-header/detail-header';
import { Icon } from '../../../../shared/ui/icon/icon';
import { ResourceState } from '../../../../shared/ui/resource-state/resource-state';
import { CompanyDrawer } from '../../ui/company-drawer/company-drawer';

/**
 * Ficha de la empresa: un solo registro, sin lista. Cabecera con logo, nombre y NIT, paneles
 * de datos legales y de contacto, y «Editar» abre el panel lateral. Solo administración.
 */
@Component({
  selector: 'app-company-profile',
  imports: [DatePipe, DetailHeader, Icon, ResourceState, StatusChip, CompanyDrawer],
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'menuOpen.set(false)',
  },
  templateUrl: './company-profile.html',
})
export class CompanyProfile {
  protected readonly store = inject(CompanyStore);
  private readonly notifications = inject(Notifications);

  protected readonly crumbs: readonly Crumb[] = [
    { label: 'Administración' },
    { label: 'Empresa' },
  ];
  protected readonly acceptedTypes = IMAGE_TYPES.join(',');

  protected readonly tax = this.store.tax;
  protected readonly rateLabel = computed(() => taxRateLabel(this.tax().tasaIva));
  /** Ejemplo breve del efecto de la configuración vigente. */
  protected readonly taxSummary = computed(() => {
    const tax = this.tax();
    if (!tax.aplicaIva) {
      return 'Los productos se cobran por su precio y el ticket no muestra IVA.';
    }
    const example = taxExample(tax.tasaIva);
    return tax.ivaIncluido
      ? `Un producto de ${example} se cobra ${example}; el IVA va dentro del precio.`
      : `Un producto de $1.00 se cobra ${example}; el IVA se suma al precio.`;
  });

  protected readonly editing = signal(false);
  protected readonly menuOpen = signal(false);
  protected readonly busy = signal(false);

  constructor() {
    // Normalmente ya cargó al arrancar la app; si falló entonces, se reintenta al entrar.
    this.store.load();
  }

  protected onDocumentClick(event: Event): void {
    if (this.menuOpen() && !(event.target as HTMLElement).closest('[data-more-menu]')) {
      this.menuOpen.set(false);
    }
  }

  protected uploadLogo(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file) {
      return;
    }
    if (!IMAGE_TYPES.includes(file.type)) {
      this.notifications.error('Formato no permitido. Usá JPG, PNG o WEBP.');
      return;
    }
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      this.notifications.error(`La imagen supera ${MAX_IMAGE_MB} MB.`);
      return;
    }

    this.busy.set(true);
    this.store.uploadLogo(file).subscribe({
      next: () => this.logoDone('Logo actualizado.'),
      error: () => this.busy.set(false),
    });
  }

  protected removeLogo(): void {
    this.menuOpen.set(false);
    this.busy.set(true);
    this.store.removeLogo().subscribe({
      next: () => this.logoDone('Logo eliminado.'),
      error: () => this.busy.set(false),
    });
  }

  private logoDone(message: string): void {
    this.busy.set(false);
    this.notifications.success(message);
  }
}
