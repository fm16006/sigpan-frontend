import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PuntoDeVenta } from './punto-de-venta';

describe('PuntoDeVenta', () => {
  let component: PuntoDeVenta;
  let fixture: ComponentFixture<PuntoDeVenta>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PuntoDeVenta]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PuntoDeVenta);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
