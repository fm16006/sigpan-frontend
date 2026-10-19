import { Component, OnInit, computed, inject, input, output, signal } from '@angular/core';
import { HttpErrorResponse, httpResource } from '@angular/common/http';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { API_ENDPOINTS } from '../../../../core/constants/api-endpoints';
import { AppError, toAppError } from '../../../../core/http/app-error';
import { applyFieldErrors, firstErrorMessage } from '../../../../core/http/form-errors';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { Id } from '../../../../core/models/api.model';
import {
  PROMOTION_TYPES,
  PROMOTION_TYPE_LABELS,
  Promotion,
  PromotionDraft,
  PromotionProductLink,
  PromotionType,
} from '../../../../core/models/promotion.model';
import { ApiClient } from '../../../../core/http/api-client';
import { Notifications } from '../../../../core/services/notifications';
import { PromotionService } from '../../services/promotion.service';

type Vigencia = 'RANGO' | 'MES';

/** Alta y edicion de una promocion, con sus productos. Los errores del backend se muestran junto al campo o arriba. */
@Component({
  selector: 'app-promotion-form',
  imports: [ReactiveFormsModule],
  templateUrl: './promotion-form.html',
})
export class PromotionForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly service = inject(PromotionService);
  private readonly api = inject(ApiClient);
  private readonly notifications = inject(Notifications);

  /** Promoción a editar; null para crear. */
  readonly promotion = input<Promotion | null>(null);
  readonly saved = output<Promotion>();
  readonly cancelled = output<void>();

  protected readonly types = PROMOTION_TYPES;
  protected readonly typeLabels = PROMOTION_TYPE_LABELS;

  protected readonly products = httpResource<CatalogProduct[]>(
    () => this.api.url(API_ENDPOINTS.productos.root),
    { defaultValue: [] },
  );

  protected readonly form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(150)]],
    descripcion: [''],
    tipoDescuento: this.fb.nonNullable.control<PromotionType>('PORCENTAJE', Validators.required),
    valorDescuento: [0, [Validators.required, Validators.min(0)]],
    vigencia: this.fb.nonNullable.control<Vigencia>('RANGO'),
    mes: [''],
    fechaInicio: [''],
    fechaFin: [''],
    prioridad: [0, [Validators.required, Validators.min(0)]],
  });

  /** Ids de productos marcados. Un producto solo o varios (bloque). */
  protected readonly selectedIds = signal<ReadonlySet<Id>>(new Set());
  protected readonly saving = signal(false);
  protected readonly formError = signal<string | null>(null);
  protected readonly isEdit = computed(() => this.promotion() !== null);

  private loadedLinks: readonly PromotionProductLink[] = [];

  ngOnInit(): void {
    // Los inputs ya tienen valor aquí (no en el constructor): datos de la promoción y sus productos.
    const current = this.promotion();
    if (current) {
      this.form.patchValue({
        nombre: current.nombre,
        descripcion: current.descripcion ?? '',
        tipoDescuento: current.tipoDescuento,
        valorDescuento: current.valorDescuento,
        prioridad: current.prioridad ?? 0,
        vigencia: 'RANGO',
        fechaInicio: current.fechaInicio ?? '',
        fechaFin: current.fechaFin ?? '',
      });
      this.service.productLinks(current.id).subscribe((links) => {
        this.loadedLinks = links;
        this.selectedIds.set(new Set(links.map((link) => link.productoId)));
      });
    }
  }

  protected isSelected(productId: Id): boolean {
    return this.selectedIds().has(productId);
  }

  protected toggleProduct(productId: Id, checked: boolean): void {
    const next = new Set(this.selectedIds());
    if (checked) {
      next.add(productId);
    } else {
      next.delete(productId);
    }
    this.selectedIds.set(next);
  }

  protected fieldError(field: string): string | null {
    return firstErrorMessage(this.form, field);
  }

  protected save(): void {
    this.formError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (this.selectedIds().size === 0) {
      this.formError.set('Seleccioná al menos un producto.');
      return;
    }

    const draft = this.draft();
    this.saving.set(true);

    const current = this.promotion();
    const request = current
      ? this.service.update(current.id, draft)
      : this.service.create(draft);

    request.subscribe({
      next: (promotion) => this.syncProducts(promotion),
      error: (error: unknown) => this.onError(error),
    });
  }

  protected cancel(): void {
    this.cancelled.emit();
  }

  private draft(): PromotionDraft {
    const raw = this.form.getRawValue();
    const porMes = raw.vigencia === 'MES';
    return {
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() || null,
      tipoDescuento: raw.tipoDescuento,
      valorDescuento: Number(raw.valorDescuento),
      mes: porMes ? raw.mes || null : null,
      fechaInicio: porMes ? null : raw.fechaInicio || null,
      fechaFin: porMes ? null : raw.fechaFin || null,
      prioridad: Number(raw.prioridad),
    };
  }

  /** Crea los vínculos nuevos y quita los que ya no están marcados. */
  private syncProducts(promotion: Promotion): void {
    const selected = this.selectedIds();
    const current = new Set(this.loadedLinks.map((link) => link.productoId));

    const toAdd = [...selected].filter((id) => !current.has(id));
    const toRemove = this.loadedLinks.filter((link) => !selected.has(link.productoId));

    const operations = [
      ...toAdd.map((productoId) => this.service.addProduct(promotion.id, productoId)),
      ...toRemove.map((link) => this.service.removeLink(link.id)),
    ];

    const work = operations.length > 0 ? forkJoin(operations) : of([]);
    work.subscribe({
      next: () => {
        this.saving.set(false);
        this.notifications.success(
          this.promotion() ? 'Promoción actualizada.' : 'Promoción creada.',
        );
        this.saved.emit(promotion);
      },
      error: (error: unknown) => this.onError(error),
    });
  }

  private onError(error: unknown): void {
    this.saving.set(false);
    const appError: AppError = toAppError(error as HttpErrorResponse);
    applyFieldErrors(this.form, appError);

    // Errores de nivel de objeto (p. ej. rango de fechas) no pertenecen a un control: van arriba.
    const generales = Object.entries(appError.fieldErrors)
      .filter(([field]) => !this.form.get(field))
      .map(([, message]) => message);
    if (generales.length > 0) {
      this.formError.set(generales.join(' '));
    } else if (Object.keys(appError.fieldErrors).length === 0) {
      this.formError.set(appError.message);
    }
  }
}
