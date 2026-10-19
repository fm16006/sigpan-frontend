import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { API_ENDPOINTS } from '../constants/api-endpoints';
import { ApiClient } from '../http/api-client';
import { Company, CompanyDraft, taxConfigOf, toBusinessInfo } from '../models/company.model';

/**
 * Datos de la empresa, cargados una vez y compartidos (ticket, pie de la tienda, marca,
 * pantalla de Empresa). `info()` nunca está vacío: mientras carga o si el API falla
 * devuelve `BUSINESS_INFO`, así la aplicación no se rompe.
 *
 * `GET /empresa` es público porque la tienda en línea muestra el nombre y el contacto sin
 * iniciar sesión; son los mismos datos que ya salen impresos en cada ticket.
 */
@Injectable({ providedIn: 'root' })
export class CompanyStore {
  private readonly api = inject(ApiClient);

  private readonly state = signal<Company | null>(null);
  private readonly loadState = signal<'idle' | 'loading' | 'loaded' | 'failed'>('idle');

  /** Datos reales de la empresa; null mientras carga o si falló. */
  readonly company = this.state.asReadonly();
  readonly status = this.loadState.asReadonly();
  /** Datos listos para mostrar: reales o, en su defecto, los de respaldo. */
  readonly info = computed(() => toBusinessInfo(this.state()));
  /** Configuración del IVA vigente (13 % incluido mientras no llegan los datos). */
  readonly tax = computed(() => taxConfigOf(this.state()));

  /** Carga los datos una sola vez; con `force` vuelve a pedirlos. Un fallo deja el respaldo. */
  load(force = false): void {
    if (!force && this.loadState() !== 'idle' && this.loadState() !== 'failed') {
      return;
    }
    this.loadState.set('loading');
    this.api.get<Company>(API_ENDPOINTS.empresa.root).subscribe({
      next: (company) => {
        this.state.set(company);
        this.loadState.set('loaded');
      },
      error: () => this.loadState.set('failed'),
    });
  }

  update(draft: CompanyDraft): Observable<Company> {
    return this.api
      .put<Company>(API_ENDPOINTS.empresa.root, draft)
      .pipe(tap((company) => this.remember(company)));
  }

  uploadLogo(file: File): Observable<Company> {
    const body = new FormData();
    body.append('archivo', file);
    return this.api
      .post<Company>(API_ENDPOINTS.empresa.logo, body)
      .pipe(tap((company) => this.remember(company)));
  }

  removeLogo(): Observable<Company> {
    return this.api
      .delete<Company>(API_ENDPOINTS.empresa.logo)
      .pipe(tap((company) => this.remember(company)));
  }

  private remember(company: Company): void {
    this.state.set(company);
    this.loadState.set('loaded');
  }
}
