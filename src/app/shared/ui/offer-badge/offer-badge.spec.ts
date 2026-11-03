import { TestBed } from '@angular/core/testing';
import { ProductOffers } from '../../../core/models/offer.model';
import { OfferBadge } from './offer-badge';

const OFFERS: ProductOffers = {
  productoId: 1,
  precioOriginal: 1,
  precioOferta: 0.8,
  ofertas: [
    { tipo: 'DESCUENTO', regla: 'PROMOCION:1', etiqueta: '20 % de descuento', precio: 0.8 },
    { tipo: 'COMBO', regla: 'COMBO:2', etiqueta: 'Combo desayuno', precio: 2.5 },
  ],
};

async function render(size?: 'sm' | 'xs'): Promise<HTMLElement[]> {
  const fixture = TestBed.createComponent(OfferBadge);
  fixture.componentRef.setInput('offers', OFFERS);
  if (size) fixture.componentRef.setInput('size', size);
  await fixture.whenStable();
  return [...(fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>('.badge')];
}

describe('Insignia de oferta (HU-30)', () => {
  it('muestra una insignia por cada oferta, con su descripción al pasar el cursor', async () => {
    const badges = await render();

    expect(badges.map((b) => b.textContent?.trim())).toEqual(['Oferta', 'Combo']);
    expect(badges.map((b) => b.title)).toEqual(['20 % de descuento', 'Combo desayuno']);
    expect(badges[0].classList).toContain('badge-success');
    expect(badges[1].classList).toContain('badge-info');
  });

  it('usa el tamaño de la tienda por defecto y el compacto en el punto de venta', async () => {
    const [shop] = await render();
    expect(shop.classList).toContain('badge-sm');

    const [pos] = await render('xs');
    expect(pos.classList).toContain('badge-xs');
    expect(pos.classList).not.toContain('badge-sm');
  });
});
