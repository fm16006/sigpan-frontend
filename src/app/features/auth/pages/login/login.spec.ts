import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { throwError } from 'rxjs';
import { AppError } from '../../../../core/http/app-error';
import { Auth } from '../../../../core/services/auth';
import { GoogleIdentity } from '../../../../core/services/google-identity';
import { Login } from './login';

describe('Login', () => {
  function crear(error: AppError) {
    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideRouter([]),
        { provide: Auth, useValue: { login: () => throwError(() => error), role: () => null } },
        { provide: GoogleIdentity, useValue: { enabled: false } },
      ],
    });

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();
    return fixture;
  }

  function enviar(fixture: ReturnType<typeof crear>): HTMLElement {
    const host = fixture.nativeElement as HTMLElement;
    const correo = host.querySelector<HTMLInputElement>('#email')!;
    const clave = host.querySelector<HTMLInputElement>('#password')!;
    correo.value = 'ana@gmail.com';
    correo.dispatchEvent(new Event('input'));
    clave.value = 'clave-correcta';
    clave.dispatchEvent(new Event('input'));

    host.querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
    return host;
  }

  it('muestra el mensaje del backend cuando la cuenta está bloqueada (423)', () => {
    const fixture = crear({
      kind: 'locked',
      status: 423,
      message: 'Cuenta bloqueada por intentos fallidos. Intenta de nuevo a las 15:15',
      fieldErrors: {},
    });

    const host = enviar(fixture);

    expect(host.querySelector('[role="alert"]')?.textContent).toContain(
      'Cuenta bloqueada por intentos fallidos. Intenta de nuevo a las 15:15',
    );
  });

  it('mantiene el mensaje genérico cuando las credenciales son incorrectas (401)', () => {
    const fixture = crear({ kind: 'auth', status: 401, message: 'Correo o contrasena incorrectos.', fieldErrors: {} });

    const host = enviar(fixture);

    expect(host.querySelector('[role="alert"]')?.textContent).toContain('Correo o contraseña incorrectos.');
  });
});
