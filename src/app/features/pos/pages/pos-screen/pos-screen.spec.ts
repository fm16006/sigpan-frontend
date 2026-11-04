import { provideHttpClient } from '@angular/common/http';
import {
  HttpTestingController,
  TestRequest,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { API_CONFIG, ApiConfig } from '../../../../core/config/api.config';
import { CatalogProduct } from '../../../../core/models/catalog.model';
import { ProductOffers } from '../../../../core/models/offer.model';
import { Quote, QuoteSuggestion } from '../../../../core/models/quote.model';
import { SessionStore } from '../../../../core/services/session-store';
import { CashRegisterStore } from '../../services/cash-register.store';
import { PosScreen } from './pos-screen';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

function product(id: number, codigo: string, nombre: string, disponible = 10): CatalogProduct {
  return {
    id,
    codigo,
    nombre,
    descripcion: null,
    precio: 0.5,
    categoriaId: 1,
    categoria: 'Pan dulce',
    unidadVenta: 'unidad',
    especialidad: 'PAN_DULCE',
    alergenos: null,
    activo: true,
    imagenUrl: null,
    stockMinimo: 0,
    disponible,
    agotado: disponible <= 0,
  };
}

const PAN = product(1, 'PF-001', 'Pan francés');
const CAFE = product(2, 'E2E-007', 'Café');
const CONCHA = product(3, 'PD-004', 'Concha', 0);
const CATALOG = [PAN, CAFE, CONCHA];

/** Cotización simple: cada unidad a $0.50, con las sugerencias que pida la prueba. */
function quoteFor(
  body: { lineas: { productoId: number; cantidad: number }[] },
  sugerencias: QuoteSuggestion[] = [],
): Quote {
  const lineas = body.lineas.map((l) => ({
    productoId: l.productoId,
    cantidad: l.cantidad,
    precioUnitario: 0.5,
    subtotal: l.cantidad * 0.5,
    descuento: 0,
    total: l.cantidad * 0.5,
    regla: null,
  }));
  const total = lineas.reduce((sum, l) => sum + l.total, 0);
  return {
    lineas,
    subtotal: total,
    descuento: 0,
    total,
    aplicaIva: true,
    ivaIncluido: true,
    tasaIva: 13,
    ventasGravadas: total,
    ventasExentas: 0,
    iva: 0,
    ahorro: 0,
    reglaAplicada: null,
    descartadas: [],
    sugerencias,
  };
}

describe('Pantalla del punto de venta', () => {
  let httpMock: HttpTestingController;
  let fixture: ComponentFixture<PosScreen>;
  let offers: ProductOffers[];
  let suggestions: QuoteSuggestion[];

  beforeEach(() => {
    localStorage.clear();
    offers = [];
    suggestions = [];
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: API_CONFIG, useValue: CONFIG },
        {
          provide: CashRegisterStore,
          useValue: {
            estado: signal('abierta'),
            turno: signal(null),
            lugar: signal(null),
            ultimoCierre: signal(null),
            refrescar: () => undefined,
          },
        },
      ],
    });
    TestBed.inject(SessionStore).set({
      accessToken: 't',
      expiresIn: 900,
      user: { id: 7, name: 'Ana Cajera', email: 'ana@sigpan.test', role: 'CAJERO' },
    });
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    localStorage.clear();
  });

  /** Responde lo pendiente; las cotizaciones solo si `quotes` es true. Devuelve las que quedaron sin responder. */
  function answer(quotes = true): TestRequest[] {
    const held: TestRequest[] = [];
    for (const req of httpMock.match(() => true)) {
      if (req.cancelled) continue;
      const url = req.request.url.split('?')[0];
      if (url.endsWith('/ventas/cotizar')) {
        if (quotes) req.flush(quoteFor(req.request.body, suggestions));
        else held.push(req);
      } else if (url.endsWith('/productos/ofertas')) {
        req.flush(offers);
      } else if (url.endsWith('/productos/activos')) {
        req.flush(CATALOG);
      } else if (/\/productos\/\d+$/.test(url)) {
        req.flush(CATALOG.find((p) => url.endsWith(`/productos/${p.id}`)) ?? null);
      } else if (url.includes('/turnos')) {
        req.flush(null);
      } else {
        req.flush([]);
      }
    }
    return held;
  }

  async function settle(quotes = true): Promise<TestRequest[]> {
    let held: TestRequest[] = [];
    for (let i = 0; i < 4; i++) {
      fixture.detectChanges();
      held = [...held, ...answer(quotes)];
      // Con una cotización retenida la app no queda estable: solo se deja correr lo pendiente.
      await (held.length > 0 ? new Promise((resolve) => setTimeout(resolve)) : fixture.whenStable());
    }
    fixture.detectChanges();
    return held;
  }

  async function render(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(PosScreen);
    await settle();
    return fixture.nativeElement as HTMLElement;
  }

  /** Espera a que pase el debounce del ticket (150 ms) y a que salga la cotización. */
  async function afterDebounce(quotes = true): Promise<TestRequest[]> {
    fixture.detectChanges();
    await new Promise((resolve) => setTimeout(resolve, 170));
    return settle(quotes);
  }

  function tile(host: HTMLElement, name: string): HTMLButtonElement {
    return host.querySelector<HTMLButtonElement>(`button[aria-label="Agregar ${name}"]`)!;
  }

  function totalText(host: HTMLElement): HTMLElement {
    return [...host.querySelectorAll<HTMLElement>('div.flex.items-baseline')].find((el) =>
      el.textContent?.includes('Total'),
    )!;
  }

  function ticketNames(host: HTMLElement): string[] {
    return [...host.querySelectorAll('li button[aria-pressed] span.font-semibold')].map(
      (el) => el.textContent?.trim() ?? '',
    );
  }

  function press(key: string): void {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  }

  it('HU-28: el refresco de cada 30 s también trae las ofertas nuevas (liquidación sin recargar)', async () => {
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] });
    const host = await render();
    expect(tile(host, 'Pan francés').textContent).not.toContain('Liquidación');

    offers = [
      {
        productoId: 1,
        precioOriginal: 0.5,
        precioOferta: 0.35,
        ofertas: [{ tipo: 'LIQUIDACION', regla: 'LIQUIDACION:1', etiqueta: 'Liquidación: -$0.15', precio: 0.35 }],
      },
    ];
    vi.advanceTimersByTime(30_000);
    expect(httpMock.match((r) => r.url.endsWith('/productos/ofertas')).map((r) => r.flush(offers))).toHaveLength(1);
    await settle();

    expect(tile(host, 'Pan francés').textContent).toContain('Liquidación');
  });

  it('HU-30: un producto agotado muestra «Agotado» y su oferta, con el texto del combo a la vista', async () => {
    offers = [
      {
        productoId: 3,
        precioOriginal: 0.5,
        precioOferta: null,
        ofertas: [
          { tipo: 'COMBO', regla: 'COMBO:4', etiqueta: 'En combo Desayuno a $1.50', precio: 1.5 },
          { tipo: 'ESCALA', regla: 'ESCALA:9', etiqueta: 'Desde 12 u. a $0.40 c/u', precio: 0.4 },
        ],
      },
    ];
    const host = await render();

    const card = tile(host, 'Concha');
    const badges = [...card.querySelectorAll('.badge')].map((b) => b.textContent?.trim());
    expect(badges).toEqual(['Agotado', 'Combo', 'Mayoreo']);
    expect(card.textContent).toContain('En combo Desayuno a $1.50 · Desde 12 u. a $0.40 c/u');
  });

  it('HU-32: mientras se recotiza conserva el último total (en gris), no $0.00', async () => {
    const host = await render();
    tile(host, 'Pan francés').click();
    await afterDebounce();
    expect(totalText(host).textContent).toMatch(/0[.,]50/);

    tile(host, 'Pan francés').click();
    const held = await afterDebounce(false);

    // A los 170 ms ya salió la cotización nueva (debounce de 150 ms) y todavía no llega.
    expect(held).toHaveLength(1);
    expect(totalText(host).textContent).toMatch(/0[.,]50/);
    expect(totalText(host).textContent).not.toMatch(/0[.,]00/);
    expect(totalText(host).classList).toContain('opacity-50');

    held[0].flush(quoteFor(held[0].request.body));
    await settle();
    expect(totalText(host).textContent).toMatch(/1[.,]00/);
    expect(totalText(host).classList).not.toContain('opacity-50');
  });

  it('HU-33: muestra la sugerencia de combo en el ticket y su botón agrega lo que falta', async () => {
    suggestions = [
      {
        tipo: 'COMBO',
        regla: 'COMBO:4',
        productoId: 2,
        producto: 'Café',
        faltan: 1,
        precio: 1.5,
        mensaje: 'Agregá 1 Café y completás el combo Desayuno ($1.50).',
      },
    ];
    const host = await render();
    tile(host, 'Pan francés').click();
    await afterDebounce();

    const list = host.querySelector('ul[aria-label="Sugerencias de ahorro"]')!;
    expect(list.textContent).toContain('Agregá 1 Café y completás el combo Desayuno ($1.50).');

    suggestions = [];
    list.querySelector<HTMLButtonElement>('button[aria-label="Agregar 1 Café"]')!.click();
    await afterDebounce();

    expect(ticketNames(host)).toEqual(['Pan francés', 'Café']);
    expect(host.querySelector('ul[aria-label="Sugerencias de ahorro"]')).toBeNull();
  });

  it('HU-34: un escaneo con el foco fuera del buscador agrega el producto y su «-» no quita líneas', async () => {
    const host = await render();
    tile(host, 'Pan francés').click();
    await afterDebounce();
    (document.activeElement as HTMLElement | null)?.blur();

    [...'E2E-007', 'Enter'].forEach(press);
    await afterDebounce();

    expect(ticketNames(host)).toEqual(['Pan francés', 'Café']);
    // El «-» tecleado a mano sigue siendo el atajo: baja la línea activa (el café recién escaneado).
    await new Promise((resolve) => setTimeout(resolve, 40));
    press('-');
    await afterDebounce();
    expect(ticketNames(host)).toEqual(['Pan francés']);
  });
});
