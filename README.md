# SIGPAN · Frontend

Aplicación web del Sistema Integral de Gestión de Panadería en Línea.

**IGF115 · Ingeniería del Software · Ciclo II 2026 · Universidad de El Salvador · Equipo 3**

---

## Estado

Repositorio vacío. La primera línea de código se escribe el **21 de septiembre de 2026**, con
el arranque del Sprint 2. Este README describe cómo va a quedar el repositorio y qué reglas lo
gobiernan, no lo que ya existe.

## Stack

| Capa | Tecnología | Por qué |
|---|---|---|
| Framework | Angular 22 | Trae de fábrica enrutamiento, formularios reactivos, cliente HTTP e inyección de dependencias. Menos decisiones técnicas que tomar y justificar, y más consistencia en un equipo que trabaja distribuido |
| Lenguaje | TypeScript | Tipado estático; es lo que convierte un cambio del backend en un error de compilación |
| Estilos | Tailwind CSS v4 | Interfaces adaptativas consistentes sin hojas de estilo extensas. Tiene guía oficial de integración con Angular |
| Cliente de API | Generado desde OpenAPI | Ver la sección siguiente. **No se escribe a mano** |
| Pruebas unitarias y de componente | Jasmine + Karma | Incluidos de fábrica en el andamiaje de Angular |
| Accesibilidad | axe-core | Verifica el RNF-10 dentro de las pruebas de componente |
| Aceptación | Playwright | Navegador real contra backend real, desde el Sprint 2 |

Sobre Vite: **no hace falta instalarlo**. Angular usa Vite internamente para su servidor de
desarrollo desde la versión 17, así que `ng serve` ya lo está usando.

## Requisitos previos

- **Node.js 22 LTS**
- **npm** (o pnpm, si el equipo lo prefiere — pero uno solo, fijado, no los dos)
- **Docker** y **Docker Compose**, para levantar el backend

```bash
node -v     # debe decir 22
```

## Cómo levantarlo

Desde la raíz de `Código Fuente/`:

```bash
docker compose up
```

Para trabajar solo en el frontend, con el backend ya corriendo:

```bash
npm install
npm start        # ng serve, en http://localhost:4200
```

## El cliente de API se genera, no se escribe

**Esta es la regla más importante de este repositorio.**

Los tipos y el cliente HTTP salen del esquema OpenAPI que publica el backend. No se escriben a
mano, no se copian de un ejemplo, no se «ajustan» cuando algo no cuadra.

```bash
npm run api:generate     # lee /v3/api-docs y regenera src/app/api/
```

`src/app/api/` es **código generado**. Editarlo a mano se pierde en la siguiente regeneración,
y el pipeline lo detecta.

### Por qué esta regla existe

Cuando el frontend y el backend son dos aplicaciones separadas, cada lado prueba su mitad
simulando a la otra. El frontend construye un simulacro que devuelve lo que el programador
**cree** que el servidor manda; el servidor prueba su contrato de forma aislada. Ninguna prueba
verifica que las dos suposiciones coincidan.

Un simulacro que devuelve exactamente lo que el programador supone no prueba el contrato:
prueba la suposición. El día que el servidor cambia la forma de una respuesta, **las dos suites
siguen en verde** y la aplicación queda rota entre ellas. Y no se manifiesta en el pipeline: se
manifiesta en pantalla, delante de quien esté usando el sistema.

Generando el cliente, ese error deja de ser un fallo en producción y pasa a ser un **error de
compilación** que `tsc --noEmit` atrapa en el Gate 2. Cuesta medio día de configuración una
sola vez.

## Estructura

```
src/app/
├── core/            Guards de rol, interceptores, servicio de sesión, manejo de errores
├── shared/          Componentes, directivas y pipes reutilizables (moneda, fecha local)
├── api/             GENERADO desde OpenAPI — no editar a mano
├── layout/          Cascarón del portal, barra lateral por rol, encabezado
└── features/
    ├── autenticacion/     Inicio de sesión, recuperación            (CAR-08)
    ├── catalogo/          Productos, especialidades, precios        (CAR-01)
    ├── inventario/        Insumos, entradas, kardex, alertas        (CAR-02)
    ├── produccion/        Fórmulas, órdenes, registro de producción (CAR-03)
    ├── promociones/       Alta y vigencia de reglas                 (CAR-04)
    ├── punto-de-venta/    Caja, cobro, corte de turno               (CAR-05)
    ├── tienda/            Catálogo público, carrito, compra         (CAR-06)
    ├── pedidos/           Panel del despachador, seguimiento        (CAR-07)
    └── reportes/          Los dieciséis reportes y el tablero       (CAR-09)

e2e/                 Recorridos de Playwright
```

Componentes standalone, que es el modo por defecto de Angular 22. Cada carpeta de `features/`
carga por rutas diferidas.

## El frontend nunca recalcula un total

Decisión **DD-08**. La pantalla muestra el total que el servidor devolvió; no lo suma por su
cuenta.

La razón es aritmética: el servidor calcula con `BigDecimal` y el navegador lo haría con
`number` de JavaScript, que es punto flotante de 64 bits. Que los dos diverjan en centavos es
cuestión de tiempo, y el cliente vería un total distinto del que se le cobra.

Es la misma familia de defecto que la deriva del contrato: dos lados calculando por su cuenta
algo que debería venir de uno solo.

## Pruebas

```bash
npm test                 # Jasmine + Karma
npm run test:watch
npx playwright test      # aceptación end-to-end
```

Las **cuatro comprobaciones** que exige la Definición de terminado, y que el Gate 2 corre en
cada push. Las cuatro, no solo la primera:

```bash
npm test -- --watch=false
npx tsc --noEmit
npm run lint
npm run build -- --configuration production
```

Se ejecutan además en una **matriz de dos zonas horarias** —`America/El_Salvador` y `UTC`— con
`fail-fast: false`. No es exceso de celo: la liquidación por sobreproducción se activa a una
hora configurada, los cortes de caja son por turno, los reportes agrupan por día y por mes, y
la panadería abre a las 5 de la mañana, hora a la que la fecha local y la UTC ya están en días
distintos. Una prueba que asuma UTC aquí no falla en el pipeline: falla cuadrando la caja.

### La regla de las pruebas

**Se escriben leyendo el criterio de aceptación en Jira, no leyendo el código.** Y cada prueba
nueva se verifica por mutación antes de aceptarla: se rompe a propósito el comportamiento que
protege, se confirma el rojo, se revierte, se confirma el verde. La mutación se menciona en el
mensaje de commit.

## Accesibilidad y usabilidad

No son deseos, son requisitos con umbral y con gate:

| Requisito | Qué exige | Cómo se verifica |
|---|---|---|
| **RNF-09** | El punto de venta es **operable solo con teclado** | Recorrido de Playwright que completa una venta sin usar el ratón |
| **RNF-10** | Contraste de texto nivel AA de WCAG 2.1 | `axe-core` en las pruebas de componente |
| **RNF-08** | Un cajero capacitado completa una venta de 5 productos en menos de 45 s | Prueba cronometrada con una persona ajena al equipo |
| **RNF-01** | El catálogo carga en menos de 2 s con 300 productos | Lighthouse CI contra un build de producción, no contra `ng serve` |

El RNF-09 solo se puede verificar en un navegador real: la suite de Angular corre contra un DOM
simulado y no distingue entre un botón alcanzable con `Tab` y uno que solo responde al clic. Es
una de las razones por las que Playwright existe en este proyecto desde el Sprint 2.

## Ninguna pantalla miente

Condición 7 de la Definición de terminado, y es literal:

- **Ningún botón que aparente una acción que el backend no soporta.** Si la funcionalidad no
  existe todavía, el control se retira o se muestra como no disponible. El hueco honesto gana
  al botón falso.
- **Ninguna cifra que no venga de la base de datos.** Nada de números de ejemplo en el JSX
  «mientras conectamos el endpoint».

Aplica con especial cuidado a **HU-53, el tablero de indicadores de gerencia**. Es la pantalla
donde más barato sale escribir cuatro cifras de ejemplo «mientras conectamos el endpoint» y más
caro sale dejarlas: son los números que la gerencia mira primero y los que menos se cuestionan,
porque se presentan como un hecho.

## Convenciones

- **Español** en comentarios, nombres de prueba y mensajes de commit. Con tildes.
- El mensaje de commit explica el **porqué**, no el qué. Referencia la clave de la historia:
  `feat(SIG-31): el carrito recalcula el descuento sin recargar`.
- Una rama por historia. Se incorpora a la principal solo por solicitud de cambios **revisada y
  aprobada por un integrante distinto del autor**.
- Los nombres de las pruebas son frases legibles:

```ts
it('sugiere cuántas unidades faltan para alcanzar el precio de docena', …);
it('muestra el total que devolvió el servidor, no uno calculado en el navegador', …);
it('no permite cerrar la venta si el monto recibido es menor al total', …);
```

## Documentación relacionada

| Documento | Qué responde |
|---|---|
| `../../Anexos/gestion-de-calidad/03-decisiones-de-dominio.md` | Qué significa cada palabra ambigua de las historias |
| `../../Anexos/gestion-de-calidad/04-definicion-de-terminado.md` | Las nueve condiciones para pasar una historia a LISTO |
| `../../Anexos/gestion-de-calidad/05-estrategia-de-pruebas.md` | Qué nivel prueba qué, y por qué el cliente se genera |
| `../../Anexos/gestion-de-calidad/09-quality-gates.md` | Qué bloquea una fusión |
| `../../Anexos/artefactos-scrum/SIGPAN-backlog-jira.csv` | Las 55 historias con sus criterios de aceptación |
| `../sigpan-backend/README.md` | El otro lado del contrato |
