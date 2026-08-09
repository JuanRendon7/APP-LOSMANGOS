# Hotel Los Mangos — Plan y estado del proyecto

Última actualización: 2026-08-08 (Fase 8: reportería por área de negocio, notificaciones
con sonido, corrección de caja compartida, rediseño ilustrado de habitaciones/mesas,
colores de estado unificados y reordenamiento del sidebar).

## Qué es esto

App de gestión integral para Hotel Los Mangos: hospedaje (17 habitaciones), restaurante
(comandas a cocina), bar (productos con código de barras), caja y reportería.
Alcance completo pedido por el dueño, en sus palabras:

- **Restaurante**: registrar ventas (ej. "1 bandeja de res", "cerdo") con impresión de
  comanda a cocina.
- **Bar**: productos con código de barras — precio de costo vs. precio de venta, margen
  de ganancia.
- **Hotel**: 17 habitaciones — piso 1: 102 a 108, piso 2: 201 a 210. Estado de la
  habitación. Por huésped: nombre, cédula, contacto, placa del vehículo. Historial de
  huéspedes para autollenado en próximas estadías. Agregar productos/consumos a la
  cuenta de la habitación.
- **Tabla maestra de precios** del hotel (tarifario) para parametrizar tarifas.
- **Sincronización de calendario con Booking.com** (iCal).
- **Mapa de mesas** del restaurante — tocar una mesa para abrir su cuenta.
- **Roles**: administrador ("el malo", acceso total) y empleado (ventas y datos
  sensibles restringidos).
- **Cierre de caja**: total del día, balance con gastos registrados.
- **Registro de gastos**.
- **Métodos de pago**: QR, tarjeta, transferencia, efectivo, con reporte por método.
- **Reportería** general.
- **Identidad visual**: gris y blanco, con logo.

## Stack

- **Backend**: FastAPI + SQLAlchemy 2 + Alembic + PostgreSQL (schema `hotel`), Celery +
  Redis (para tareas futuras, ej. sync Booking), `uv` como gestor de paquetes.
- **Frontend**: React 19 + Vite + TypeScript + Tailwind v4, react-hook-form + zod,
  axios, react-router. `components/ui` (shadcn) está configurado pero vacío — el
  proyecto usa Tailwind plano con el helper `cn`, no hay componentes shadcn generados
  todavía.
- **Docker**: `docker-compose.yml` (dev, hot-reload) y `docker-compose.prod.yml`
  (producción, multi-stage). Migraciones y seed corren automáticamente al arrancar
  (`backend/docker-entrypoint.sh`).

## Cómo levantar el proyecto

```
docker compose up -d --build
```

- Backend: http://localhost:8020 (docs en `/docs`)
- Frontend: http://localhost:55174
- Login admin: `admin@hotellosmangos.com` / ver `ADMIN_PASSWORD` en `.env` (root) —
  actualmente `dev-local-only-secret`.

## Patrón arquitectónico (repetir en cada fase nueva)

Cada dominio de negocio es un paquete en `backend/src/<dominio>/`:

```
models.py       # SQLAlchemy, Mapped[...], hereda Base + TimestampMixin
repository.py   # consultas, un XxxRepository por paquete
service.py      # reglas de negocio, lanza NotFoundError/ConflictError/BusinessRuleError
schemas.py      # Pydantic (Create/Update/Response)
router.py       # APIRouter(s), permisos via requiere_permiso("RECURSO", "ACCION")
dependencies.py # get_xxx_service(db=Depends(get_db))
```

- Registrar el modelo en `backend/src/shared/models_registry.py` y el router en
  `backend/src/main.py`.
- Errores de dominio (`src/shared/exceptions.py`) ya se traducen a HTTP 404/409/422 en
  `main.py` — no hay que repetir ese manejo en cada router.
- RBAC: recursos/acciones se siembran en `backend/src/seed.py`
  (`RECURSOS_ACCIONES`/`EMPLEADO_PERMISOS`) — **ya están sembrados los recursos de
  TODAS las fases futuras** (RESTAURANTE, MESAS, PEDIDOS, VENTAS, CAJA, GASTOS,
  PRODUCTOS_BAR con `VER_COSTOS`, BOOKING_SYNC, etc.), aunque el módulo aún no exista.
  Revisar esa tabla antes de diseñar permisos de una fase nueva.
- Frontend: cada dominio es `frontend/src/features/<dominio>/` con `types.ts`, `api.ts`
  (axios), páginas y modales (`react-hook-form` + `zod`, patrón `Campo` reutilizable
  dentro del archivo). Rutas nuevas van en `App.tsx` envueltas en `RequiereSesion` +
  `RequierePermiso recurso="X" accion="VER"`; el link de nav se agrega a `ENLACES` en
  `frontend/src/shared/layout/AppShell.tsx` (se oculta solo si el usuario no tiene el
  permiso).

## Fases

1. ~~**Fase 0-1: Andamiaje**~~ — DONE. Auth/RBAC completo (usuario, rol, permiso,
   recurso), JWT, seed idempotente, frontend login/AppShell, Docker dev+prod.
2. ~~**Fase 2: Habitaciones, huéspedes y reservas**~~ — DONE. Paquete
   `backend/src/hospedaje/` (`Habitacion`, `Huesped`, `Reserva`). Reservas con fechas
   futuras (no solo check-in del día). Ciclo `RESERVADA → CHECK_IN →
   CHECK_OUT/CANCELADA`. Estados de habitación: `DISPONIBLE / OCUPADA / LIMPIEZA /
   MANTENIMIENTO` (transiciones manuales limitadas, `OCUPADA` solo vía check-in).
   Autollenado de huésped por cédula (historial). Frontend: `features/hospedaje/`
   (tablero de habitaciones por piso, modal de reserva, panel de detalle).
3. ~~**Fase 3: Tarifario y precio automático**~~ — DONE. Paquete
   `backend/src/tarifas/` (`Temporada`: rango de fechas inclusivo, precio/noche,
   activa). El precio varía **solo por temporada**, no por tipo de habitación (decisión
   del usuario). Cada noche de una reserva debe estar cubierta por una temporada activa
   o la creación falla con 422 — no hay precio por defecto inventado. `Reserva` ganó
   `precio_total`, calculado por `TarifasService.calcular_precio_total` e inyectado en
   `HospedajeService`. Solo ADMINISTRADOR gestiona tarifas; EMPLEADO sí ve el total de
   una reserva. Frontend: `features/tarifas/` (tabla CRUD, modal crear/editar), link
   "Tarifario" solo visible para admin, total visible en el panel de reserva.
4. ~~**Fase 4: Productos (restaurante y bar)**~~ — DONE. Paquete
   `backend/src/productos/` (`ProductoRestaurante`, `ProductoBar`). Sin categorías (decisión
   del usuario). `ProductoBar` tiene `codigo_barras` único, `precio_costo`, `precio_venta`
   y `stock` (con inventario desde ya, ajustable manualmente vía
   `POST /productos-bar/{id}/ajustar-stock`, sin historial de movimientos). El costo y
   el margen (`margen`, `margen_porcentaje`) solo viajan en la respuesta si el actor
   tiene `PRODUCTOS_BAR:VER_COSTOS` — si no, van en `null` (empleado ve el catálogo
   completo para vender, pero no costos). Sin borrado (`ELIMINAR`) en ninguno de los
   dos catálogos: se desactivan con `activo`, porque las Fases 5-7 van a referenciar
   productos desde pedidos/ventas. Frontend: `features/productos/`
   (`ProductosRestaurantePage`, `ProductosBarPage` con columnas de costo/margen ocultas
   si no hay `VER_COSTOS`, `AjustarStockModal`), enlaces "Restaurante" y "Bar" en el nav.
5. ~~**Fase 5: Restaurante (mesas, pedidos, comanda)**~~ — DONE. Paquete
   `backend/src/restaurante/` (`Mesa`, `Pedido`, `PedidoItem`). Mapa de mesas con
   layout libre (posición `pos_x`/`pos_y` en % arrastrable, sin librería de
   drag-and-drop — `onPointerDown/Move/Up` nativos + `setPointerCapture`). Pedidos con
   seguimiento en cocina: `ABIERTO → ENVIADO_COCINA → EN_PREPARACION → LISTO →
   ENTREGADO → CERRADO` (transición secuencial vía `TRANSICIONES_PEDIDO`, mismo patrón
   que `TRANSICIONES_HABITACION_PERMITIDAS`). `PedidoItem.precio_unitario` se copia de
   `ProductoRestaurante.precio_venta` al agregarlo (no cambia si el menú cambia
   después). Impresión de comanda: ruta `/pedidos/:id/comanda` **sin `AppShell`**
   (ticket plano, `window.print()` automático al cargar), abierta con `window.open()`
   desde el panel del pedido. Sin borrado de mesas (se desactivan, igual que
   habitaciones/productos, porque los pedidos las referencian por FK). Frontend:
   `features/restaurante/` (`MapaMesasPage` con modo edición admin-only,
   `MesaFormModal`, `PedidoPanel`, `ComandaPage`), enlace "Mesas" en el nav.
6. ~~**Fase 6: Consumo a habitación**~~ — DONE. Paquete `backend/src/consumo/`
   (`ConsumoItem`). Se puede cargar tanto bar como restaurante a una habitación con
   check-in activo (`reserva.estado == "CHECK_IN"`, si no `BusinessRuleError`). Sin
   seguimiento de cocina — es un registro simple con `precio_unitario` copiado del
   catálogo al agregar (mismo criterio que `PedidoItem`). **Cargar un item de bar
   descuenta stock automáticamente** (`ProductosService.ajustar_stock_bar`, reutilizada
   de la Fase 4) y quitarlo lo restaura. Gateado con el recurso `VENTAS` (ya sembrado,
   sin usar hasta ahora): empleado puede `VER`/`CREAR` pero no `EDITAR` (no puede quitar
   un item ya cargado, solo el admin). El consumo **no se guarda en `Reserva`** — se
   suma en el frontend (`ConsumoPanel`, dentro de `ReservaDetailPanel`) mostrando
   "Hospedaje + Consumo = Total", para no acoplar el módulo de consumo al de hospedaje
   más de lo necesario. 6 tests nuevos (50 total). Verificado end-to-end con Playwright.
7. ~~**Fase 7: Caja**~~ — DONE (2026-08-07). Paquete `backend/src/caja/`
   (`TurnoCaja`, `Gasto`, `Venta`, `VentaItem`). **Cierre de caja por turno/empleado**
   (decisión del usuario): cada usuario abre su propia caja (`monto_apertura`) y la
   cierra declarando el efectivo contado; el sistema calcula
   `monto_esperado_efectivo = apertura + efectivo_vendido - gastos` y la `diferencia`
   contra lo contado (ambos computados en el router al serializar, no persistidos —
   mismo criterio que `Pedido.total`/`ConsumoResumenResponse.total`). Un usuario no
   puede tener dos turnos abiertos a la vez; sí pueden coexistir turnos abiertos de
   distintos usuarios. **Método de pago capturado en todo cobro**: `CajaService`
   orquesta los tres flujos de venta reutilizando los servicios de otras fases en vez
   de duplicar su lógica — `cobrar_habitacion` suma `Reserva.precio_total` +
   consumo (vía `ConsumoRepository`) y llama a `HospedajeService.check_out`;
   `cobrar_pedido` suma los items del pedido y llama a `RestauranteService.cerrar_pedido`;
   `venta_mostrador` es un flujo nuevo (bar/restaurante sin mesa ni habitación, ej.
   venta de mostrador por código de barras) con `VentaItem` polimórfico igual a
   `ConsumoItem` de la Fase 6, que también descuenta stock de bar
   (`ProductosService.ajustar_stock_bar`). Los endpoints crudos de check-out
   (`POST /reservas/{id}/check-out`) y cerrar pedido (`POST /pedidos/{id}/cerrar`) se
   dejaron intactos en el backend pero el frontend ya no los llama directamente para el
   flujo normal — usa `/caja/ventas/habitacion` y `/caja/ventas/pedido`, que exigen una
   caja abierta y sí registran el pago. Excepción: `PedidoPanel` conserva un botón
   "Cancelar pedido (sin cobro)" que sí usa el endpoint crudo, solo visible si el pedido
   está vacío (liberar una mesa sin venta, ej. cliente que se va sin pedir). Gastos:
   `GASTOS:EDITAR`/`ELIMINAR` solo para admin (empleado registra pero no corrige/borra,
   igual criterio que "Cerrar mesa"/quitar consumo en fases previas). `VENTAS:EDITAR`
   sigue sin usarse — una venta cobrada es un registro financiero inmutable en esta
   fase, sin función de "anular venta" todavía. Frontend: `features/caja/CajaPage.tsx`
   (resumen del turno, gastos con edición inline, "Venta rápida (mostrador)" con
   carrito local antes de cobrar, apertura/cierre de caja), enlace "Caja" en el nav.
   8 tests nuevos (58 total). Verificado end-to-end con Playwright (cobro de habitación,
   cobro de mesa, venta de mostrador con descuento de stock, gasto, cierre con
   diferencia $0).
7.5. ~~**Gestión de usuarios (Administración → Usuarios)**~~ — DONE (2026-08-07). El
   backend de usuarios/roles ya existía desde el Andamiaje (`GET/POST /usuarios`,
   `PATCH /usuarios/{id}`, `GET /roles`, gateados con `requiere_rol("ADMINISTRADOR")`
   directo, no con el sistema de permisos granular) pero sin frontend. Se agregó
   `cedula` (única) y `celular` a `Usuario` (antes solo tenía nombre/email) — migración
   con backfill (`cedula = 'PENDIENTE-' || id_usuario` para filas existentes, o sea el
   admin sembrado; conviene editarlo desde la UI nueva para poner su cédula real).
   Formulario de creación: nombre completo, cédula, celular, correo, clave de acceso,
   y **un solo rol** (Administrador o Empleado — el backend soporta `roles: string[]`
   pero la UI simplifica a selección única, que es como se usan los dos roles reales
   del negocio). Autoprotección: un admin no puede desactivarse ni cambiarse el rol a
   sí mismo desde el formulario (`esUsuarioActual`, controles deshabilitados). Sin
   borrado — se desactiva con `activo` (mismo patrón que habitaciones/mesas/productos).
   3 tests nuevos (65 total). **De paso se corrigió un descuido**: la página de
   Reportes (fusionada con el antiguo "Resumen") estaba gateada con `RESERVAS:VER`
   (que EMPLEADO sí tiene), cuando el recurso correcto — ya sembrado desde el
   Andamiaje para exactamente este fin — es `REPORTES:VER` (solo ADMINISTRADOR). Se
   corrigió en `App.tsx`/`AppShell.tsx` y "Reportes" se movió del grupo Operación al
   grupo Administración del sidebar, junto con Tarifario y Usuarios.
8. ~~**Fase 8: Reportería**~~ — DONE (2026-08-08). Sin paquete backend propio: es
   100% frontend, alimentado por endpoints que ya existían de fases anteriores
   (`listarHabitaciones`, `listarReservas`, `listarVentas`, `listarTurnos`,
   `listarProductosBar/Restaurante`, `listarGastos`). `frontend/src/features/reportes/`
   se reorganizó en pestañas por área de negocio en vez de una sola página con todo
   mezclado: `ReportesPage.tsx` (selector de pestaña + `RangoFechas` compartido) +
   `HotelTab.tsx` (ocupación, reservas por estado, ingresos por habitación, export CSV
   de reservas), `RestauranteTab.tsx` (ventas de mesa/mostrador de restaurante por
   método de pago), `BarTab.tsx` (ídem para bar + valor de inventario + alerta de stock
   bajo), `CajaTab.tsx` (histórico de turnos, recaudo por método, turnos con descuadre,
   export CSV). Cada tab reutiliza los componentes compartidos de `reportes/shared.tsx`
   (`StatCard`, `Chip`, `formatoMoneda`). Gateado con `REPORTES:VER` (solo admin, ya
   corregido en la Fase 7.5). El viejo dashboard "Resumen" (KPIs clickeables + gráficas)
   ya estaba fusionado dentro de esta página desde el rediseño visual del 2026-08-07;
   con esta fase se reorganizó ese contenido dentro de `HotelTab`.
9. **Fase 9: Sincronización con Booking.com** (iCal) — pendiente, en pausa. Ya existe
   `BOOKING_ICAL_TOKEN_SECRET` en la config del backend, la librería `icalendar` en
   `pyproject.toml` (sin usar todavía) y Celery+Redis+Beat corriendo en Docker Compose
   pero sin ninguna tarea registrada (`include=[]` en `celery_app.py`) — sería la
   primera tarea periódica real del proyecto. `Reserva` ya tiene `origen` y
   `referencia_externa` preparados para distinguir reservas directas de las
   sincronizadas, pero `referencia_externa` no tiene constraint de unicidad todavía
   (hace falta para no importar la misma reserva de Booking dos veces). Recurso ya
   sembrado: `BOOKING_SYNC` (solo admin). **Bloqueada** (2026-08-08) hasta que el
   usuario confirme cómo está publicado el hotel en Booking.com: si cada habitación
   (102...210) es su propio listado/calendario, o si Booking agrupa varias
   habitaciones físicas en pocos "tipos de habitación" — esto cambia por completo
   cómo mapear las reservas que lleguen de allá a una `Habitacion` concreta. También
   falta decidir si el alcance es solo importar reservas de Booking, solo exportar las
   propias, o ambas direcciones (el usuario ya pidió ambas direcciones cuando se
   retome).

## Rediseño visual (2026-08-07): sidebar + marca

Se reemplazó el AppShell de top-nav por un **sidebar izquierdo colapsable** con
secciones agrupadas (OPERACIÓN: Inicio/Habitaciones/Reportes/Mesas/Restaurante/Bar/Caja;
ADMINISTRACIÓN: Tarifario), inspirado en una referencia visual que dio el usuario.
Detalles:

- **Paleta de marca**: extraída de `docs/unnamed.jpg` (foto del letrero "Los Mangos ·
  Hotel & Restaurante" — pared beige/taupe cálida, tinta casi negra, resplandor cálido
  de spots). Tokens en `frontend/src/index.css` (`@theme`): escala `--color-marca-*`
  neutro cálido (antes gris puro). **Sin acento naranja** (se probó una versión
  terracota primero y se descartó del todo, incluido en el commit `cf6942d`): hoy
  `--color-primary` es la propia tinta oscura del logo (`--color-marca-800`), y el
  segundo color de marca es `--color-mango-*` (verde hoja, deliberadamente más
  oliva/bosque que el esmeralda que ya se usaba para el estado "disponible", para no
  confundir marca con estado — ver la unificación de colores de estado del
  2026-08-08 más abajo) más `--color-oro-*` (dorado, solo acentos puntuales: líneas,
  subrayados, nunca fondos ni botones). Tokens nuevos `--color-chart-2/3/4` solo para
  gráficas.
- **Icono de marca**: `frontend/src/shared/ui/MangoIcon.tsx` — SVG dibujado a mano
  (dos hojas + mango con línea de brillo), no la foto (que es un mockup de pared, no
  escala bien a tamaños pequeños). Usar este componente para cualquier lugar nuevo que
  necesite el icono (favicon, splash, etc.), no la foto.
- **Fondo difuminado** (`frontend/public/brand-bg.jpg`, copia de `docs/unnamed.jpg`):
  a pantalla completa y bien difuminado en el login (`LoginPage.tsx`, momento de marca
  fuerte, baja densidad de información); muy sutil y solo detrás del panel del sidebar
  en el resto de la app (`AppShell.tsx`) — nunca detrás de tablas/formularios, para no
  sacrificar contraste de texto.
- **Dashboard "Inicio"** (`frontend/src/features/dashboard/DashboardPage.tsx`): ya no es
  un placeholder — stat cards + gráfica de barras (reservas por estado) + donut
  (ocupación) con `recharts` (dependencia que ya estaba instalada sin usar), alimentado
  100% por endpoints que ya existían (`listarHabitaciones`, `listarReservas`,
  `listarProductosRestaurante`, `listarProductosBar`), sin cambios de backend.
- **Reporte por fechas** (`frontend/src/features/hospedaje/ReportesPage.tsx`, nuevo,
  ruta `/reportes`): exporta CSV client-side (sin librería nueva, `Blob` + `<a
  download>`) de reservas filtradas por rango de fechas, usando el filtro
  `desde`/`hasta` que `GET /reservas` ya soportaba en el backend pero el frontend no
  exponía — se agregó a `listarReservas` en `frontend/src/features/hospedaje/api.ts`.
- **Ojo con gráficas de `recharts` + tokens CSS**: un color de dona/barra pasado como
  `var(--color-marca-200)` puede quedar casi invisible si es muy cercano al fondo de la
  tarjeta (le pasó a la dona de ocupación) — usar al menos `--color-marca-400` para
  cualquier segmento "neutro" en una gráfica, nunca los tonos 100-200 de la escala.
- **Ajuste posterior (mismo día)**: a pedido del usuario, el fondo de marca pasó de
  "solo detrás del sidebar" a **global** — `frontend/src/shared/layout/BrandBackdrop.tsx`
  (nuevo, componente reutilizable con `position:fixed` + imagen difuminada + velo de
  color encima) se monta una sola vez en `AppShell.tsx` (detrás de sidebar y contenido)
  y otra vez en `LoginPage.tsx` (más visible ahí, es el momento de marca fuerte). De
  paso se aplanó el diseño: se quitó `shadow-sm`/`shadow-xl` de tarjetas y del header
  (que ahora es `bg-marca-50/70` sin `backdrop-blur`, no vidrio) — los `shadow-lg` de
  los modales SÍ se dejaron (necesitan elevación real sobre el overlay oscuro). Si se
  agrega una tarjeta nueva en cualquier página, seguir el patrón sin sombra (`border
  border-border bg-card`, sin `shadow-*`) para mantener la consistencia plana.
- **Fondo de marca mucho más visible (2026-08-07, segundo ajuste)**: el usuario insistió
  ("QUE ESA IMAGEN SEA EL FONDO DE TODO") en que la foto de `docs/unnamed.jpg` se
  reconociera de verdad, no solo un tinte casi imperceptible. `BrandBackdrop.tsx` ganó
  un tercer prop `desenfoquePx` (antes el blur estaba fijo en `blur-3xl` vía clase de
  Tailwind, ahora es `filter: blur(Npx)` inline para poder graduarlo) y los valores por
  defecto subieron bastante: `opacidadImagen` 0.16→0.4, `opacidadVelo` 0.6→0.5,
  desenfoque de "blur-3xl" (irreconocible) a 5px (se lee claramente el letrero "LOS
  MANGOS · HOTEL & RESTAURANTE"). En `LoginPage.tsx` es todavía más fuerte
  (`opacidadImagen=0.6`, `opacidadVelo=0.32`, `desenfoquePx=2`) porque es el momento de
  marca más fuerte y la tarjeta del formulario (`bg-card/90`) sigue totalmente legible
  encima. Funciona sin perder contraste porque las tarjetas (`bg-card`) son de color
  sólido, no transparente — el fondo solo "respira" en los huecos entre tarjetas, en el
  sidebar y en pantallas con poco contenido (ej. el estado vacío de "Abrir caja" en
  Vender), nunca detrás de texto suelto sobre tarjetas.
- **Corrección: se veía pixelada (2026-08-07, tercer ajuste)**: al subir la visibilidad
  de la foto se notó que se veía borrosa/pixelada en pantallas anchas. Causa:
  `docs/unnamed.jpg` es de 1254×1254px, pero `BrandBackdrop.tsx` usaba
  `background-size: cover` + `scale-110`, lo que en un monitor de 1920px de ancho
  fuerza a estirar la imagen a ~1.7× su resolución nativa (cover escala por el lado más
  exigente, aquí el ancho). Con el desenfoque grande de la primera versión (`blur-3xl`)
  eso no se notaba; al bajar el desenfoque para que el logo se reconociera, la
  pixelación quedó expuesta. Arreglo: se quitó `cover` y `scale-110`, ahora usa
  `background-size: min(1300px, 105vw)` (casi 1:1 con el original, nunca más de ~1.04×
  de escala) centrado, con el velo de color rellenando el resto sin costura visible —
  se ve como una foto nítida enmarcada en el color de marca, no una imagen estirada de
  borde a borde.
- **"Vender" como sección principal (2026-08-07, a pedido del usuario tras mostrar
  Alegra POS como referencia)**: la landing page (`/`) ya no es el dashboard — ahora es
  `frontend/src/features/caja/VenderPage.tsx`, una pantalla de venta rápida de
  mostrador (bar/restaurante sin mesa ni habitación) que antes vivía como tarjeta
  secundaria dentro de `/caja`. Si el usuario no tiene turno de caja abierto, la propia
  pantalla lo resuelve inline (formulario compacto de apertura) sin salir del flujo. El
  dashboard se movió a `/inicio` (ya no es la raíz). En el sidebar, "Vender" es el
  primer enlace del grupo Operación (ícono `ShoppingCart`), "Inicio" quedó segundo.
  `CajaPage.tsx` perdió la tarjeta de venta rápida — ahora es puramente administrativa
  (turno, gastos, cierre). Sin cambios de backend, solo reordenamiento de
  navegación/rutas en el frontend.
- **"Inicio" renombrado a "Resumen" + KPIs clickeables (2026-08-07)**: ruta movida de
  `/inicio` a `/resumen` (`frontend/src/features/dashboard/DashboardPage.tsx`, mismo
  componente). Las 6 tarjetas de KPI ahora son botones: las 4 de habitaciones/reservas
  alternan un panel de detalle inline (`DetalleKpi`, mismo archivo) que lista los
  registros reales usando los datos ya cargados en memoria (sin llamadas nuevas al
  backend) — ej. click en "Ocupadas" muestra número de habitación + huésped; click en
  "Reservas activas" muestra huésped, habitación, estado y fechas, con un link "Ir a
  Reportes". Las 2 de productos navegan directo a `/productos/restaurante` y
  `/productos/bar` (ya tienen su propia página completa, no necesitan vista inline).
- **Escaneo de código de barras en "Vender" (2026-08-07)**: en
  `frontend/src/features/caja/VenderPage.tsx`, el input de código de barras está
  auto-enfocado al entrar a la pantalla (para que un lector de códigos, que solo
  "escribe" caracteres y Enter, funcione sin clicks). Al presionar Enter busca el
  producto en el catálogo de bar ya cargado en memoria (`ProductoBar.codigo_barras`,
  sin llamada nueva al backend) y lo agrega al carrito; si ya estaba en el carrito,
  **suma cantidad a la misma línea** en vez de duplicarla (aplica igual al agregar
  manualmente). Si el código no existe muestra un error inline y vuelve a enfocar el
  input. El selector manual (origen/producto/cantidad) se dejó debajo como respaldo,
  necesario para productos de restaurante (no tienen código de barras).
- **"Movimientos de este turno" en Vender (2026-08-07)**: debajo del carrito, lista
  cronológica (más reciente primero) de las ventas del turno abierto — hora, origen
  (Habitación/Mesa/Mostrador), método de pago y monto. Alcance elegido: por **turno**
  (`GET /caja/ventas?id_turno=`, ya existía desde la Fase 7), no por día calendario —
  no hay endpoint de filtro por fecha en el backend y turno ya es, en la práctica, "la
  sesión del día" de cada cajero. Se refresca sola tras cada cobro
  (`cargarMovimientos()` en `VenderPage.tsx`). Si más adelante se quiere un
  histórico multi-turno por fecha, hace falta agregar filtro `desde`/`hasta` en
  `backend/src/caja/router.py` (no existe todavía).
- **Detalle de producto en movimientos + buscador de producto (2026-08-07)**: cada fila
  de "Movimientos de este turno" ahora muestra debajo el detalle
  (`venta.items.map(i => `${cantidad}× ${nombre_producto}`)`, ya venía en la respuesta
  del backend, `VentaResponse.items`, sin usar en el frontend hasta ahora); si la venta
  no tiene items (cobro de habitación/mesa, que no genera `VentaItem`) muestra "Sin
  detalle de productos". El selector manual de producto en "Vender" dejó de ser un
  `<select>` nativo — ahora es `BuscadorProducto` (mismo archivo,
  `VenderPage.tsx`), un combobox liviano hecho a mano (sin librería nueva) que filtra
  la lista ya cargada en memoria mientras se escribe, con Enter seleccionando la
  primera coincidencia, igual de "instantáneo" que el flujo de código de barras.
- **Rediseño de la pantalla "Abrir caja" en Vender (2026-08-07)**: el usuario la vio
  "plana, fea, sin ajustar a la página" (una caja chica pegada arriba-izquierda con
  mucho espacio vacío debajo). Ahora, cuando no hay turno abierto, `VenderPage.tsx`
  centra el contenido verticalmente (`min-h-[70vh] flex items-center justify-center`),
  con un saludo "Bienvenido de nuevo, {primer nombre del usuario}" arriba y una tarjeta
  `rounded-2xl` más grande con ícono circular (`Wallet` en un círculo
  `bg-primary/10`), título, subtítulo y el formulario de apertura — mismo patrón visual
  (icono en círculo + jerarquía tipográfica) que ya usan las StatCard de Resumen, para
  que se sienta parte del mismo sistema de diseño y no una pantalla aparte. El mismo
  saludo se repite arriba cuando ya hay turno abierto, ahí con el subtítulo "Turno
  abierto con {monto} en caja" en vez del CTA de apertura. La tarjeta de venta perdió
  su `<h1>Vender</h1>` (redundante con el saludo y con el título "Vender" que ya pone
  `AppShell` en la barra superior) y ahora dice "Nueva venta".
- **Movimientos con producto + mejoras de Vender (2026-08-07)**: el usuario notó que
  "Movimientos de este turno" mostraba el origen genérico ("Mostrador") en vez de qué
  se vendió. Se invirtió la jerarquía: la línea principal ahora es el resumen de
  productos (`2× Cerveza, 1× Bandeja de res`) y el origen quedó como contexto secundario
  (`CONTEXTO_ORIGEN`: "Venta directa" / "Cobro de habitación" / "Cobro de mesa"),
  sin la palabra "Mostrador" en ningún lado. De ahí salieron 4 mejoras adicionales,
  elegidas por el usuario entre varias propuestas:
  - **Total vendido del turno**: se lee directo de `turno.total_efectivo/tarjeta/
    transferencia/qr` (ya calculados por el backend desde la Fase 7, sin llamada
    nueva), mostrado en el header de "Movimientos de este turno". Requirió pasar el
    objeto `turno` completo a `VentaMostrador` (antes solo recibía `idTurno`) y un
    callback `onCambio` para que `VenderPage` refresque el turno después de cada venta.
  - **Aviso de stock bajo**: al agregar un producto de bar (escaneado o manual), si
    `stock - cantidad_ya_en_carrito - cantidad_agregada <= 5` se muestra un aviso en
    ámbar. Es una estimación en cliente (no hay llamada al backend), calculada contra
    el `stock` ya cargado en memoria.
  - **Acceso directo a "Cerrar caja"**: link junto al saludo cuando hay turno abierto,
    visible solo con `CAJA:CERRAR`, que navega a `/caja`.
  - **Deshacer última venta** (requirió backend): nuevo endpoint
    `POST /caja/ventas/deshacer-ultima` (`VENTAS:EDITAR`, o sea solo admin — mismo
    criterio que el resto de correcciones en Caja) en `backend/src/caja/`. Solo permite
    deshacer si la venta más reciente del turno es de origen `MOSTRADOR` (rechaza
    cobros de habitación/mesa con 422 — revertir esos implicaría deshacer un
    check-out o liberar una mesa, fuera de alcance). Restaura stock de bar si aplica
    (reutiliza `ProductosService.ajustar_stock_bar`) y borra la `Venta` (se agregó
    `cascade="all, delete-orphan"` a `Venta.items` en el modelo para que sus
    `VentaItem` se borren en cascada sin necesitar una migración). 4 tests nuevos
    (62 total). El botón solo aparece si el último movimiento es de origen mostrador.
- **Fusión "Resumen" dentro de "Reportes" (2026-08-07)**: con "Vender" como landing
  page, el dashboard "Resumen" perdía su rol de pantalla de bienvenida y quedaba
  redundante con lo que ya se ve coloreado en Habitaciones/Bar/Restaurante — el usuario
  lo notó y pidió fusionarlo. `frontend/src/features/dashboard/` se eliminó por
  completo; su contenido (KPIs clickeables, gráficas de `recharts`) se movió arriba del
  formulario de exportar CSV en `frontend/src/features/hospedaje/ReportesPage.tsx`, que
  ya vivía ahí por ser el reporte de reservas. La ruta `/resumen` y el enlace "Resumen"
  del sidebar se eliminaron (el sidebar de Operación bajó de 9 a 8 ítems). El botón "Ir
  a Reportes" de la tarjeta de detalle de KPI para "Reservas activas" ya no tiene
  sentido (es la misma página) y se quitó; los demás KPIs conservan su botón "Ir a
  Habitaciones".
- **Autocompletar huésped por nombre además de por cédula (2026-08-08)**: el
  `ReservaFormModal.tsx` ya autollenaba cédula/contacto/placa por coincidencia exacta
  de cédula (Fase 2). Se agregó búsqueda con debounce por nombre
  (`buscarHuespedes(texto)`, ya existía en el backend) con un dropdown de sugerencias;
  al elegir una, `aplicarHuesped()` llena el resto de campos igual que el flujo por
  cédula. No se creó una tabla `personas` nueva — el dueño la pidió pero `Huesped`
  (cédula única, Fase 2) ya cumple ese rol; solo faltaba el segundo camino de
  autocompletado.
- **Campana de notificaciones (2026-08-08)**: `frontend/src/shared/notifications/`
  (nuevo, sin paquete backend — se computa en el cliente sondeando endpoints que ya
  existían cada 60s vía `useNotificaciones.ts`). Seis tipos: stock bajo de bar,
  llegadas de hoy, checkouts de hoy, check-in atrasado (los tres de habitaciones,
  gateados por `HABITACIONES:VER`), turno de caja abierto hace más de 12h y descuadre
  de caja del día anterior (estos dos gateados por `REPORTES:VER`, o sea solo admin).
  Click en una notificación abre un modal de detalle con botón "Ir a la sección" y
  "Eliminar"; lectura/descarte se guardan en `localStorage` (por navegador, no por
  cuenta — descarte con TTL de 20h, sin sync entre dispositivos, aceptado como
  simplificación razonable para el tamaño de este negocio). **Sonido configurable**:
  `sonidos.ts` sintetiza 5 tonos con Web Audio API (osciladores, sin archivos de
  audio) — suena solo cuando aparece una notificación genuinamente nueva (no en la
  carga inicial de la página, para no pitar con alertas viejas pendientes). El sonido
  por defecto del hotel se elige en Maestros → Notificaciones
  (`backend/src/configuracion/`, paquete nuevo con tabla clave/valor genérica
  `configuracion_app`, pensada para crecer con más ajustes de parametrización más
  adelante) — `CONFIGURACION:VER` para todos, `CONFIGURACION:EDITAR` solo admin.
- **Habitaciones y Mesas: rediseño ilustrado (2026-08-08)**: a pedido del usuario
  ("que se vea 3D, buen diseño"), se reemplazaron las tarjetas planas por objetos
  ilustrados con CSS/SVG (gradientes radiales imitando madera + anillo de color de
  estado + insignia circular con ícono), sin librería 3D nueva (Three.js se evaluó y
  se descartó por peso/latencia frente al ritmo operativo de "tocar rápido").
  `MapaMesasPage.tsx`: mesas con sillas posicionadas por trigonometría alrededor de
  un tablero circular. `HabitacionesPage.tsx`: puertas con marca "Hotel Los Mangos" en
  verde centrada. El panel de detalle de reserva (`ReservaDetailPanel.tsx`) se movió
  de debajo de la grilla de habitaciones a arriba de todo (con scroll automático al
  seleccionar una habitación) y se compactó a un layout horizontal en vez de bloques
  apilados, porque quedaba siempre fuera de vista y ocupaba demasiado espacio vertical.
- **Caja compartida para todo el hotel (2026-08-08)**: se descubrió que el modelo
  original de la Fase 7 ("un usuario no puede tener dos turnos abiertos a la vez, pero
  sí pueden coexistir turnos abiertos de distintos usuarios") no encajaba con el
  negocio real — el hotel tiene **un solo cajón físico**, así que dos empleados
  podían terminar cada uno con su propia caja abierta sobre el mismo efectivo. Se
  corrigió `backend/src/caja/` para que el turno abierto sea uno solo para todo el
  hotel, sin importar qué usuario lo abrió: `CajaRepository.obtener_turno_abierto()`
  ya no filtra por `id_usuario`; cualquiera con `CAJA:VER` ve el turno abierto por
  cualquier otro (con su nombre, campo `nombre_usuario` nuevo en la respuesta) y
  cualquiera con `CAJA:CERRAR` puede cerrarlo, no solo quien lo abrió — necesario para
  un cambio de turno normal. Esto también resolvió de encajada un callejón sin salida:
  antes, si alguien olvidaba cerrar su caja, nadie más podía verla ni cerrarla; ahora
  cualquiera que entre la ve y puede actuar. De paso se corrigió un bug real de huso
  horario en `CajaRepository._inicio_dia`/`_fin_dia` (usaban UTC en vez de
  `America/Bogota`, así que los filtros "de hoy" en Caja/Reportes perdían movimientos
  hechos en la noche colombiana).
- **Colores de estado unificados con la marca (2026-08-08)**: resuelve la nota
  pendiente de la sesión anterior. Antes cada pantalla (Habitaciones, Mesas,
  Productos, Caja, notificaciones) reinventaba su propia combinación de
  `emerald/blue/amber/red` de Tailwind, con pesos ligeramente distintos entre sí.
  Se agregaron 4 escalas nuevas a `frontend/src/index.css` (`exito`, `alerta`,
  `peligro`, `info`), con el mismo criterio de croma/luminosidad que `marca`/`mango`/
  `oro` — en particular `alerta` se alejó a propósito del matiz de `oro` para que un
  acento dorado decorativo nunca se confunda con una insignia de advertencia. Fuente
  única de verdad: `frontend/src/shared/ui/estado.ts` (`ESTILO_TONO`), que cada
  página consume en vez de reinventar. Ojo: las clases de Tailwind ahí van escritas
  completas y literales (`'bg-exito-100 text-exito-800'`), no armadas con template
  strings (`` `bg-${tono}-100` ``) — Tailwind solo genera clases que puede ver como
  texto completo en el código fuente.
- **Sidebar: Maestros dentro de Administración (2026-08-08)**: a pedido del usuario
  ("simplificar, hay muchas cards"), el grupo `Maestros` (Restaurante/Bar/Tarifario/
  Notificaciones) dejó de ser una sección propia del sidebar y pasó a ser una
  subsección colapsable dentro de `Administración` (junto a Reportes y Usuarios),
  colapsada por defecto pero que se auto-expande si la ruta activa es una de las
  suyas. El sidebar bajó de 3 grupos a 2 (`Operación`, `Administración`).

## Decisiones y convenciones a mantener

- No se implementan endpoints `ELIMINAR` para habitaciones/huéspedes (inventario fijo /
  historial), pero **sí** para tarifas (temporadas mal cargadas se borran, no se
  desactivan). Evaluar caso por caso en fases nuevas si `ELIMINAR` tiene sentido o si
  basta con un flag `activo`.
- Fechas de estadía/reserva son medio-abiertas `[checkin, checkout)`; fechas de
  temporada son inclusivas en ambos extremos. Tenerlo presente al combinar ambas en
  fases futuras.
- Precios en pesos colombianos como enteros (sin decimales), columna `Integer`, no
  `Numeric`. Formato en frontend: `Intl.NumberFormat('es-CO', { style: 'currency',
  currency: 'COP', maximumFractionDigits: 0 })`.
- Enums de estado (`ESTADOS_HABITACION`, `ESTADOS_RESERVA`) se guardan como `String` +
  `CHECK` constraint (`sa.Enum(..., native_enum=False)`), no como enum nativo de
  Postgres, para evitar `ALTER TYPE` al agregar un estado nuevo.

## Gotchas del entorno de desarrollo (ya resueltos, pero pueden repetirse)

- **Volúmenes montados**: `docker-compose.yml` solo monta `backend/src`,
  `backend/alembic` y `frontend/src`/`index.html`/`public`. Cualquier archivo nuevo
  fuera de esas rutas (`backend/tests/`, `frontend/vite.config.ts`,
  `backend/pyproject.toml`) no aparece en el contenedor hasta `docker compose build
  <servicio>`.
- **Vite en Docker/Windows**: el watcher no siempre detecta cambios por bind mount
  (inotify no se propaga bien). Ya se configuró `server.watch.usePolling: true` en
  `frontend/vite.config.ts`. Si un cambio no se refleja, `docker compose restart
  frontend`.
- **Tests contra la BD real**: `backend/tests/` corre contra la misma Postgres de
  desarrollo (no una BD aislada), usando *savepoints* por test que sí se revierten. Pero
  cualquier verificación manual (Playwright, curl) que golpee la API real deja datos
  **permanentes**. Evitar tests que asuman un estado global "pristino" (ej. "todas las
  habitaciones están DISPONIBLE") — afirmar solo sobre los datos que el propio test
  creó. Si se hace verificación manual con fechas/cédulas fijas, usar valores únicos por
  corrida para no chocar con datos de corridas anteriores.

## Pendiente de decidir con el usuario (aún no se ha preguntado)

- Fase 9 (Booking.com), **bloqueada** hasta que el usuario responda: (a) si cada
  habitación tiene su propio listado/calendario en Booking o si Booking agrupa varias
  habitaciones en pocos "tipos de habitación"; el alcance (importar/exportar/ambas) ya
  se definió como **ambas direcciones** cuando se retome.

## Estado de git al cerrar esta sesión (2026-08-08)

Todo pusheado a `origin/main`, working tree limpio. Fases 0-7.5 en los commits previos
(`39decf7`, `d326aa5`, `cfb4bff`, `a05e3dc`, `cf6942d`) y todo el trabajo de esta
sesión — Fase 8 (reportería por área), notificaciones con sonido y su configuración
(`src/configuracion/`, paquete nuevo), corrección de caja compartida + fix de huso
horario, autocompletar huésped por nombre, rediseño ilustrado de habitaciones/mesas,
colores de estado unificados (`shared/ui/estado.ts`, nuevo) y el sidebar con Maestros
anidado — en `ea57ad9`. `git log`/`git status` lo confirman rápido si hace falta
verificar en la próxima sesión.
