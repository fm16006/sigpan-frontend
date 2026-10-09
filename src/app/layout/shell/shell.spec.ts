import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import axe from 'axe-core';
import { Shell } from './shell';

describe('Shell', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Shell],
      providers: [provideRouter([])],
    }).compileComponents();
  });

  it('se renderiza con un encabezado y el punto de anclaje de las rutas', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('header h1')?.textContent).toContain('SIGPAN');
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('no tiene violaciones de accesibilidad detectables por axe-core (RNF-10)', async () => {
    const fixture = TestBed.createComponent(Shell);
    await fixture.whenStable();
    fixture.detectChanges();
    const resultado = await axe.run(fixture.nativeElement as HTMLElement);
    expect(resultado.violations.length).toBe(0);
  });
});
