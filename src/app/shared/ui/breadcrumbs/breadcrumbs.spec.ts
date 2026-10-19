import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BackofficeMenu } from '../../layout/backoffice-menu';
import { NavGroup } from '../../layout/nav.model';
import { Breadcrumbs, Crumb } from './breadcrumbs';

const GROUPS: NavGroup[] = [
  {
    label: 'Inicio',
    items: [{ label: 'Panel', path: '/backoffice', icon: 'home', roles: [], exact: true }],
  },
  {
    label: 'Inventario',
    items: [
      { label: 'Productos', path: '/backoffice/products', icon: 'bread', roles: [] },
      { label: 'Combos', path: '/backoffice/combos', icon: 'combo', roles: [] },
    ],
  },
];

async function render(crumbs: readonly Crumb[]): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [Breadcrumbs],
    providers: [provideRouter([]), { provide: BackofficeMenu, useValue: { groups: signal(GROUPS) } }],
  });
  const fixture = TestBed.createComponent(Breadcrumbs);
  fixture.componentRef.setInput('items', crumbs);
  await fixture.whenStable();
  return fixture.nativeElement as HTMLElement;
}

describe('Breadcrumbs', () => {
  it('convierte el módulo en un desplegable con sus secciones', async () => {
    const root = await render([{ label: 'Inventario' }, { label: 'Combos' }]);

    const menu = root.querySelector('details');
    expect(menu?.querySelector('summary')?.textContent).toContain('Inventario');
    const links = [...(menu?.querySelectorAll('a') ?? [])].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/backoffice/products', '/backoffice/combos']);
  });

  it('un módulo con una sola sección es un enlace directo', async () => {
    const root = await render([{ label: 'Inicio' }, { label: 'Panel' }]);

    expect(root.querySelector('details')).toBeNull();
    expect(root.querySelector('a')?.getAttribute('href')).toBe('/backoffice');
  });

  it('deja como texto la página actual y las migas que no son módulos', async () => {
    const root = await render([{ label: 'Reportes' }, { label: 'Inventario' }]);

    expect(root.querySelector('details')).toBeNull();
    expect(root.querySelector('a')).toBeNull();
    expect(root.querySelector('[aria-current="page"]')?.textContent).toBe('Inventario');
  });

  it('cierra el desplegable con Escape', async () => {
    const root = await render([{ label: 'Inventario' }, { label: 'Combos' }]);
    const menu = root.querySelector('details') as HTMLDetailsElement;
    menu.open = true;

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

    expect(menu.open).toBe(false);
  });
});
