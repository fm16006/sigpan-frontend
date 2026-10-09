import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('monta el componente raíz con el contenedor de avisos', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();

    const root = fixture.nativeElement as HTMLElement;
    expect(root.querySelector('app-toast-host')).toBeTruthy();
    expect(root.querySelector('router-outlet')).toBeTruthy();
  });
});
