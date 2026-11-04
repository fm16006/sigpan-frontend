import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CashCut, Sale } from '../../../../core/models/order.model';
import { CashRegisterStore } from '../../services/cash-register.store';
import { PosCaja } from './pos-caja';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};
const API = 'https://api.sigpan.test/api/v1';

function sale(id: number, estado: string, total: number): Sale {
  return {
    id,
    tipo: 'MOSTRADOR',
    estado,
    fecha: '2026-11-03T20:32:00',
    total,
    subtotal: total,
    descuento: 0,
    usuarioId: 7,
    usuario: 'Ana',
    caja: 'Caja 01',
    detalles: [{ id: id * 10, productoId: 3, producto: 'Pan de muerto', cantidad: 1, precio: total, descuento: 0, subtotal: total }],
  } as Sale;
}

const CUT: CashCut = {
  fecha: '2026-11-03',
  cantidadVentas: 1,
  productosVendidos: 1,
  total: 2.5,
  efectivo: 1.5,
  tarjeta: 1,
  ventas: [sale(344, 'COMPLETADA', 2.5), sale(343, 'ANULADA', 5.75)],
};

describe('Cierre de caja · ventas del día (DEF-18)', () => {
  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: API_CONFIG, useValue: CONFIG },
        {
          provide: CashRegisterStore,
          useValue: { turno: signal(null), lugar: signal(null), refrescar: () => undefined },
        },
      ],
    });
    const httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(PosCaja);
    fixture.detectChanges();
    httpMock.expectOne((request) => request.url.startsWith(`${API}/ventas/corte?`)).flush(CUT);
    await fixture.whenStable();
    fixture.detectChanges();
    httpMock.verify();
    return fixture.nativeElement as HTMLElement;
  }

  it('marca la venta anulada y no ofrece anularla de nuevo', async () => {
    const root = await render();
    const rows = [...root.querySelectorAll<HTMLElement>('.opacity-60')];
    expect(rows).toHaveLength(1);
    expect(rows[0].textContent).toContain('#343');
    expect(rows[0].textContent).toContain('Anulada');
    expect(root.querySelector('button[aria-label^="Anular ticket"]')).toBeNull();
  });

  it('muestra efectivo, tarjeta y anuladas en lugar de «Próximamente»', async () => {
    const root = await render();
    const cards = root.querySelector('.grid')!.textContent!;
    expect(cards).toContain('$1.50');
    expect(cards).toContain('$1.00');
    expect(cards).toContain('No suman al total');
    expect(cards).not.toContain('Próximamente');
  });
});
