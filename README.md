# Panadería SigPan — Frontend

Tienda en línea y backoffice para una panadería: catálogo y pedidos para clientes, punto de
venta, inventario, recetas y promociones para el personal.

Angular 21, Tailwind CSS 4, DaisyUI 5 y SSR con Express.

Nilson Escobar — Proyecto IGF115, Grupo 3, Universidad de El Salvador.

## Cómo ejecutarlo

```bash
npm install
npm start          # http://localhost:4200
npm test
npm run build
```

Antes de arrancar hay que apuntar `apiUrl` al backend en `src/environments/`. El cambio de
archivo según la configuración lo hace `fileReplacements` en `angular.json`.

| Archivo                      | Se usa en       | apiUrl |
| ---------------------------- | --------------- | ------ |
| `environment.development.ts` | `npm start`     | `http://localhost:8080/api/v1` |
| `environment.ts`             | `npm run build` | URL del servidor de producción |

El backend debe cumplir el contrato descrito más abajo: la forma de las respuestas, los
endpoints de sesión y la cookie de refresh.

## Estructura

```
src/app/
  core/          sin UI: configuración, modelos, capa HTTP, interceptores, guards, servicios
  shared/        layout, componentes de UI y pipes reutilizables
  features/      una carpeta por dominio, todas con carga diferida
```

Las dependencias van en un solo sentido: `features → shared → core`. Las features no se
importan entre sí, salvo que compartan un servicio de dominio (el POS usa `OrderService`).

`CrudClient<T, TDraft>` tiene los cinco verbos REST, así que cada servicio de recurso son
unas pocas líneas:

```ts
@Injectable({ providedIn: 'root' })
export class PromotionService extends CrudClient<Promotion, PromotionDraft> {
  constructor() {
    super(API_ENDPOINTS.promotions);
  }
}
```

## Roles

Cuatro roles, definidos como unión de tipos en `user.model.ts`:

| Rol          | Acceso |
| ------------ | ------ |
| `ADMIN`      | Todo el backoffice |
| `CASHIER`    | Solo el punto de venta; al entrar a `/backoffice` se le redirige ahí |
| `PRODUCTION` | Panel, inventario y recetas |
| `CUSTOMER`   | Solo la tienda |

El menú se arma filtrando `BACKOFFICE_NAV` por rol, así que no se muestran enlaces que el
guard vaya a rechazar.

## Seguridad

- El access token se guarda solo en memoria, nunca en `localStorage` ni `sessionStorage`.
  La sesión sobrevive a las recargas con una cookie `HttpOnly` de refresh.
- El `Bearer` se adjunta comparando el origen parseado de la URL, para no filtrarlo a un
  host ajeno. Hay un test que lo comprueba.
- Las peticiones que escriben llevan `X-XSRF-TOKEN` leído de la cookie.
- Varios 401 simultáneos comparten un solo refresh.
- Las rutas con guard se renderizan solo en el cliente (`app.routes.server.ts`), para que el
  build no deje su HTML entre los assets públicos.
- El `returnUrl` del login se valida para que no pueda apuntar a otro dominio.
- El pedido no envía totales; los calcula el backend.
- Cabeceras de seguridad en `server.ts`.

Los guards son de experiencia de usuario, no de autorización: el rol vive en un signal del
cliente y se puede alterar desde el navegador. Quien decide es el backend, en cada endpoint.

Falta la `Content-Security-Policy`. Angular inyecta estilos y el script de hidratación en
línea, así que una CSP estricta necesita un `nonce` por petición (token `CSP_NONCE`).

## Diseño

Dos temas DaisyUI, `sigpan-light` y `sigpan-dark`, que se alternan con el botón de la barra
superior. `ThemeStore` guarda la elección en `localStorage` y la aplica con `data-theme` en
el `<html>`. En los dos el primario es el mismo marrón de corteza; los cromas se mantienen
bajos para que el color lo aporten las fotos del producto.

El ancho de página sale de la utilidad `container-page` en `styles.css`: tope de 96rem y
relleno lateral que crece por tramos. Las rejillas suman columnas en las pantallas grandes
(el catálogo va de 1 a 5). Debajo de los puntos de quiebre, la barra superior y la cabecera
del panel muestran el menú en un desplegable.

## Contrato del backend

Los listados devuelven:

```jsonc
{ "content": [], "page": 0, "size": 20, "totalElements": 0, "totalPages": 0 }
```

Los errores:

```jsonc
{ "message": "…", "code": "…", "errors": { "campo": "mensaje" } }
```

El mapa `errors` se pinta junto a cada input.

### Sesión

| Método | Ruta | Notas |
| ------ | ---- | ----- |
| `POST` | `/auth/login` | `{ email, password }`, devuelve la sesión y fija la cookie de refresh |
| `POST` | `/auth/register` | `{ name, email, password }` |
| `POST` | `/auth/refresh` | Sin cuerpo, lee la cookie. 401 si ya no vale |
| `POST` | `/auth/logout` | Invalida el refresh token y borra la cookie |

```jsonc
{
  "accessToken": "…",
  "expiresIn": 900,
  "user": { "id": 1, "name": "…", "email": "…", "role": "ADMIN" }
}
```

La cookie de refresh necesita `HttpOnly`, `Secure` y `SameSite=None` si el API está en otro
dominio. El backend también debe permitir CORS con `Access-Control-Allow-Credentials: true`,
un origen explícito —no `*`— y la cabecera `X-XSRF-TOKEN`.

### Recursos

| Recurso | Rutas | Roles |
| ------- | ----- | ----- |
| Productos | `/products`, `/products/{id}`, `/products/public` | catálogo público; escritura `ADMIN` |
| Pedidos | `/orders`, `/orders/{id}`, `/orders/me`, `/orders/{id}/status` | propios el cliente; todos `ADMIN` y `CASHIER` |
| Inventario | `/inventory`, `/inventory/{id}`, `/inventory/low-stock` | `ADMIN`, `PRODUCTION` |
| Recetas | `/recipes`, `/recipes/{id}` | `ADMIN`, `PRODUCTION` |
| Promociones | `/promotions`, `/promotions/{id}`, `/promotions/active` | `ADMIN` |
| Reportes | `/reports/summary` | `ADMIN`, `PRODUCTION` |

Parámetros de listado: `page`, `size`, `sort`, `search` y `category` en el catálogo.

## Pendiente

1. Formularios de alta y edición de productos, inventario, recetas y promociones.
2. Vista para cambiar el estado de un pedido (`OrderService.changeStatus` ya existe).
3. CSP con nonce.
4. Pruebas end to end del flujo de compra y de los guards por rol.

Los formularios usan Reactive Forms y no `@angular/forms/signals`, que en Angular 21 sigue
marcado como experimental.
