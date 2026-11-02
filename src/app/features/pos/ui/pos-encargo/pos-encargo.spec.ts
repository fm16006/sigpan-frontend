import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Notifications } from '../../../../core/services/notifications';
import { OrderService } from '../../../storefront/services/order.service';
import { PosEncargo } from './pos-encargo';

const CLIENTE = { id: 7, nombre: 'Ana', email: 'ana@pan.sv', telefono: '7000-0000', rolId: 6, rol: 'CLIENTE', activo: true };

describe('PosEncargo', () => {
  const orders = { findClient: vi.fn(), counterEncargo: vi.fn() };
  let fixture: ComponentFixture<PosEncargo>;
  let dialog: any;

  beforeEach(() => {
    vi.clearAllMocks();
    orders.findClient.mockReturnValue(of(CLIENTE));
    TestBed.configureTestingModule({
      providers: [
        { provide: OrderService, useValue: orders },
        { provide: Notifications, useValue: { success: vi.fn(), messages: signal([]) } },
      ],
    });
    fixture = TestBed.createComponent(PosEncargo);
    fixture.componentRef.setInput('lines', [{ product: { id: 3 }, quantity: 2 }]);
    fixture.componentRef.setInput('total', 12.5);
    dialog = fixture.componentInstance;
  });

  it('envía el encargo a nombre del cliente encontrado', () => {
    orders.counterEncargo.mockReturnValue(of({ id: 90 }));
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);

    dialog.email.set(' ana@pan.sv ');
    dialog.search();
    dialog.date.set('2026-11-05T10:00');
    dialog.submit();

    expect(orders.findClient).toHaveBeenCalledWith('ana@pan.sv');
    expect(orders.counterEncargo).toHaveBeenCalledWith(7, {
      lineas: [{ productoId: 3, cantidad: 2 }],
      totalEsperado: 12.5,
      modalidad: 'RETIRO',
      fechaProgramada: '2026-11-05T10:00',
      telefonoContacto: '7000-0000',
    });
    expect(completed).toHaveBeenCalled();
  });

  it('no envía sin cliente ni fecha', () => {
    dialog.submit();
    expect(orders.counterEncargo).not.toHaveBeenCalled();
  });

  it('pide dirección si es entrega', () => {
    dialog.search();
    dialog.date.set('2026-11-05T10:00');
    dialog.mode = 'ENTREGA';
    dialog.submit();
    expect(orders.counterEncargo).not.toHaveBeenCalled();
    expect(dialog.error()).toContain('dirección');
  });

  it('avisa si cambió el total', () => {
    orders.counterEncargo.mockReturnValue(
      throwError(() => ({ code: 'TOTAL_CAMBIO', message: 'El total cambió' })),
    );
    const stale = vi.fn();
    fixture.componentInstance.staleTotal.subscribe(stale);
    dialog.search();
    dialog.date.set('2026-11-05T10:00');
    dialog.submit();
    expect(stale).toHaveBeenCalled();
    expect(dialog.error()).toBe('El total cambió');
    expect(dialog.saving()).toBe(false);
  });
});
