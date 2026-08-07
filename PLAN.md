# Hotel Los Mangos — Plan y estado del proyecto

Última actualización: 2026-08-06 (sesión Fase 0 a Fase 3).

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
4. **Fase 4: Productos y bar** — pendiente. Catálogo con código de barras, precio de
   costo vs. venta, margen de ganancia. Recursos RBAC ya sembrados:
   `PRODUCTOS_RESTAURANTE`, `PRODUCTOS_BAR` (con acción extra `VER_COSTOS` — el costo es
   dato sensible, ya contemplado en el seed para ocultarlo a empleados si se desea).
5. **Fase 5: Restaurante** — mapa de mesas, comandas, impresión de pedido a cocina.
   Recursos ya sembrados: `MESAS`, `PEDIDOS`.
6. **Fase 6: Consumo a habitación** — cargar productos/consumos a la cuenta de una
   habitación ocupada (conecta hospedaje + productos).
7. **Fase 7: Caja** — métodos de pago (QR/tarjeta/transferencia/efectivo), gastos,
   cierre diario con balance. Recursos ya sembrados: `CAJA` (con acción `CERRAR`),
   `GASTOS`, `VENTAS`.
8. **Fase 8: Reportería**. Recurso ya sembrado: `REPORTES`.
9. **Fase 9: Sincronización con Booking.com** (iCal). Ya existe
   `BOOKING_ICAL_TOKEN_SECRET` en la config del backend y la librería `icalendar` en
   `pyproject.toml`, sin usar todavía. `Reserva` ya tiene `origen` y
   `referencia_externa` preparados para distinguir reservas directas de las
   sincronizadas. Recurso ya sembrado: `BOOKING_SYNC`.

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

- Alcance exacto de "Registrar gastos" y "Reportería" (qué reportes específicos).
- Si el catálogo de productos (Fase 4) necesita categorías o solo nombre+precio+código
  de barras.
- Diseño del mapa de mesas (Fase 5): ¿grid fijo configurable por admin, o layout libre
  tipo canvas?

## Estado de git al cerrar esta sesión

Nada de Fase 2 ni Fase 3 está commiteado todavía (working tree con cambios). Antes de
seguir, decidir si se commitea todo junto o por fase.
