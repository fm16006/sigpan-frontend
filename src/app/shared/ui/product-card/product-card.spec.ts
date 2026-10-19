import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { API_CONFIG, ApiConfig } from '../../../core/config/api.config';
import { CatalogProduct } from '../../../core/models/catalog.model';
import { CompanyStore } from '../../../core/services/company-store';
import { ProductCard } from './product-card';

const CONFIG: ApiConfig = {
  baseUrl: 'https://api.sigpan.test/api/v1',
  origin: 'https://api.sigpan.test',
  timeoutMs: 5000,
};

const PRODUCT = {
  id: 1,
  codigo: 'PD-1',
  nombre: 'Concha',
  descripcion: null,
  precio: 1,
  categoria: 'Pan dulce',
  agotado: false,
  disponible: 20,
  stockMinimo: 5,
  imagenUrl: null,
  exentoIva: false,
} as unknown as CatalogProduct;

describe('Tarjeta de producto: aviso "+ IVA" (HU-36)', () => {
  let httpMock: HttpTestingController;
  let company: CompanyStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: API_CONFIG, useValue: CONFIG }],
    });
    httpMock = TestBed.inject(HttpTestingController);
    company = TestBed.inject(CompanyStore);
  });

  function load(tax: { aplicaIva: boolean; ivaIncluido: boolean; tasaIva: number }): void {
    company.load();
    httpMock.expectOne('https://api.sigpan.test/api/v1/empresa').flush({
      razonSocial: 'SigPan',
      nombreComercial: 'SigPan',
      nit: '0614-010190-101-3',
      nrc: '123456-7',
      giro: 'Pan',
      direccion: 'Santa Tecla',
      telefono: '2222-3333',
      correo: null,
      ...tax,
      logoUrl: null,
      actualizadoEn: null,
    });
  }

  function render(product: CatalogProduct): HTMLElement {
    const fixture: ComponentFixture<ProductCard> = TestBed.createComponent(ProductCard);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('con el IVA no incluido el precio lleva "+ IVA", sin inventar montos', () => {
    load({ aplicaIva: true, ivaIncluido: false, tasaIva: 13 });

    const card = render(PRODUCT);

    expect(card.textContent).toContain('+ IVA');
    expect(card.textContent).toContain('$1.00');
    expect(card.textContent).not.toContain('1.13');
  });

  it('un producto exento nunca lleva "+ IVA"', () => {
    load({ aplicaIva: true, ivaIncluido: false, tasaIva: 13 });

    expect(render({ ...PRODUCT, exentoIva: true }).textContent).not.toContain('+ IVA');
  });

  it('con el IVA incluido (lo de siempre) no se avisa nada', () => {
    load({ aplicaIva: true, ivaIncluido: true, tasaIva: 13 });

    expect(render(PRODUCT).textContent).not.toContain('IVA');
  });

  it('si la empresa no aplica IVA tampoco', () => {
    load({ aplicaIva: false, ivaIncluido: false, tasaIva: 13 });

    expect(render(PRODUCT).textContent).not.toContain('IVA');
  });
});
