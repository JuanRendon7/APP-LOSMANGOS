import {
  BedDouble,
  Calendar,
  LayoutGrid,
  Search,
  UserRound,
  UtensilsCrossed,
  X,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { buscarHuespedes, listarHabitaciones, listarReservas } from '@/features/hospedaje/api'
import type { Habitacion, Huesped, Reserva } from '@/features/hospedaje/types'
import { listarProductosBar, listarProductosRestaurante } from '@/features/productos/api'
import type { ProductoBar, ProductoRestaurante } from '@/features/productos/types'
import { listarMesas } from '@/features/restaurante/api'
import type { Mesa } from '@/features/restaurante/types'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO, type Tono } from '@/shared/ui/estado'

const LIMITE_POR_SECCION = 5

const TONO_ESTADO_HABITACION: Record<Habitacion['estado'], Tono> = {
  DISPONIBLE: 'exito',
  OCUPADA: 'peligro',
  LIMPIEZA: 'amarillo',
  MANTENIMIENTO: 'alerta',
}

const LABEL_ESTADO_HABITACION: Record<Habitacion['estado'], string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento',
}

const LABEL_ESTADO_PEDIDO: Record<string, string> = {
  ABIERTO: 'Tomando pedido',
  ENVIADO_COCINA: 'En cocina',
  EN_PREPARACION: 'En cocina',
  LISTO: 'Listo para servir',
  ENTREGADO: 'Servido · por cobrar',
  CERRADO: 'Servido · por cobrar',
}

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

type Detalle =
  | { tipo: 'habitacion'; habitacion: Habitacion }
  | { tipo: 'mesa'; mesa: Mesa }
  | { tipo: 'producto'; origen: 'BAR' | 'RESTAURANTE'; producto: ProductoBar | ProductoRestaurante }
  | { tipo: 'huesped'; huesped: Huesped }

function Badge({ tono, children }: { tono: Tono; children: React.ReactNode }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTILO_TONO[tono].badge}`}
    >
      {children}
    </span>
  )
}

function Fila({ etiqueta, valor }: { etiqueta: string; valor: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{etiqueta}</span>
      <span className="font-medium text-foreground">{valor}</span>
    </div>
  )
}

export function GlobalSearch() {
  const { tienePermiso } = useAuth()
  const navigate = useNavigate()
  const contenedorRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const cargadoListasRef = useRef(false)

  const [abierto, setAbierto] = useState(false)
  const [query, setQuery] = useState('')
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [productosBar, setProductosBar] = useState<ProductoBar[]>([])
  const [productosRestaurante, setProductosRestaurante] = useState<ProductoRestaurante[]>([])
  const [huespedes, setHuespedes] = useState<Huesped[]>([])
  const [detalle, setDetalle] = useState<Detalle | null>(null)
  const [proximasReservas, setProximasReservas] = useState<Reserva[] | null>(null)
  const [cargandoProximas, setCargandoProximas] = useState(false)

  const veHabitaciones = tienePermiso('HABITACIONES', 'VER')
  const veMesas = tienePermiso('MESAS', 'VER')
  const veBar = tienePermiso('PRODUCTOS_BAR', 'VER')
  const veRestaurante = tienePermiso('PRODUCTOS_RESTAURANTE', 'VER')
  const veHuespedes = tienePermiso('HUESPEDES', 'VER')

  // Las listas de habitaciones/mesas/productos son chicas (17 habitaciones, ~15
  // mesas, catalogos acotados) — se cargan una sola vez al abrir la busqueda por
  // primera vez y se filtran en memoria en cada tecla, sin golpear el backend de
  // nuevo (mismo criterio que BuscadorProducto en Vender).
  useEffect(() => {
    if (!abierto || cargadoListasRef.current) return
    cargadoListasRef.current = true
    if (veHabitaciones) listarHabitaciones().then(setHabitaciones).catch(() => {})
    if (veMesas) listarMesas().then(setMesas).catch(() => {})
    if (veBar) listarProductosBar().then(setProductosBar).catch(() => {})
    if (veRestaurante) listarProductosRestaurante().then(setProductosRestaurante).catch(() => {})
  }, [abierto, veHabitaciones, veMesas, veBar, veRestaurante])

  // Huespedes tienen su propio endpoint de busqueda en el backend (la lista
  // puede crecer bastante con el tiempo) — se consulta con debounce, no se cachea.
  useEffect(() => {
    if (!veHuespedes || query.trim().length < 2) {
      setHuespedes([])
      return
    }
    const timeout = setTimeout(async () => {
      try {
        const resultados = await buscarHuespedes(query.trim())
        setHuespedes(resultados.slice(0, LIMITE_POR_SECCION))
      } catch {
        setHuespedes([])
      }
    }, 350)
    return () => clearTimeout(timeout)
  }, [query, veHuespedes])

  // Al abrir el detalle de una habitacion, trae sus proximas reservas.
  useEffect(() => {
    if (!detalle || detalle.tipo !== 'habitacion') {
      setProximasReservas(null)
      return
    }
    setCargandoProximas(true)
    listarReservas({ idHabitacion: detalle.habitacion.id_habitacion, estado: 'RESERVADA' })
      .then((datos) =>
        setProximasReservas(
          [...datos]
            .sort((a, b) => a.fecha_checkin_prevista.localeCompare(b.fecha_checkin_prevista))
            .slice(0, 5),
        ),
      )
      .catch(() => setProximasReservas([]))
      .finally(() => setCargandoProximas(false))
  }, [detalle])

  useEffect(() => {
    function alClicFuera(e: MouseEvent) {
      if (contenedorRef.current && !contenedorRef.current.contains(e.target as Node)) {
        setAbierto(false)
      }
    }
    function alEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setAbierto(false)
        setDetalle(null)
      }
    }
    document.addEventListener('mousedown', alClicFuera)
    document.addEventListener('keydown', alEscape)
    return () => {
      document.removeEventListener('mousedown', alClicFuera)
      document.removeEventListener('keydown', alEscape)
    }
  }, [])

  const texto = query.trim().toLowerCase()
  const buscando = texto.length >= 1

  const habitacionesFiltradas = buscando
    ? habitaciones
        .filter(
          (h) => h.numero.toLowerCase().includes(texto) || h.tipo.toLowerCase().includes(texto),
        )
        .slice(0, LIMITE_POR_SECCION)
    : []
  const mesasFiltradas = buscando
    ? mesas.filter((m) => m.nombre.toLowerCase().includes(texto)).slice(0, LIMITE_POR_SECCION)
    : []
  const productosBarFiltrados = buscando
    ? productosBar
        .filter(
          (p) =>
            p.nombre.toLowerCase().includes(texto) ||
            (p.codigo_barras?.toLowerCase().includes(texto) ?? false),
        )
        .slice(0, LIMITE_POR_SECCION)
    : []
  const productosRestauranteFiltrados = buscando
    ? productosRestaurante
        .filter((p) => p.nombre.toLowerCase().includes(texto))
        .slice(0, LIMITE_POR_SECCION)
    : []

  const hayResultados =
    habitacionesFiltradas.length > 0 ||
    mesasFiltradas.length > 0 ||
    productosBarFiltrados.length > 0 ||
    productosRestauranteFiltrados.length > 0 ||
    huespedes.length > 0

  const verDetalle = (d: Detalle) => {
    setAbierto(false)
    setDetalle(d)
  }

  const irAHabitacion = (id: number) => {
    setDetalle(null)
    setQuery('')
    navigate(`/habitaciones?id=${id}`)
  }
  const irAMesa = (id: number) => {
    setDetalle(null)
    setQuery('')
    navigate(`/restaurante/mesas?id=${id}`)
  }
  const irAProducto = (origen: 'BAR' | 'RESTAURANTE', nombre: string) => {
    setDetalle(null)
    setQuery('')
    navigate(
      origen === 'BAR'
        ? `/productos/bar?q=${encodeURIComponent(nombre)}`
        : `/productos/restaurante?q=${encodeURIComponent(nombre)}`,
    )
  }

  const habitacionDeHuesped = (huesped: Huesped): Habitacion | null =>
    habitaciones.find((h) => h.reserva_activa?.huesped.id_huesped === huesped.id_huesped) ?? null

  return (
    <div ref={contenedorRef} className="relative w-28 sm:w-full sm:max-w-xs">
      <div className="flex items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 focus-within:ring-2 focus-within:ring-ring">
        <Search size={15} className="shrink-0 text-muted-foreground" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setAbierto(true)
          }}
          onFocus={() => setAbierto(true)}
          placeholder="Buscar habitacion, mesa, producto, huesped..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              inputRef.current?.focus()
            }}
            aria-label="Limpiar busqueda"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {abierto && buscando && (
        <div className="absolute right-0 z-50 mt-1.5 max-h-96 w-[calc(100vw-2rem)] max-w-80 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {!hayResultados && (
            <p className="px-3 py-6 text-center text-sm text-muted-foreground">Sin resultados.</p>
          )}

          {habitacionesFiltradas.length > 0 && (
            <div className="border-b border-border py-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Habitaciones
              </p>
              {habitacionesFiltradas.map((h) => (
                <button
                  key={h.id_habitacion}
                  onClick={() => verDetalle({ tipo: 'habitacion', habitacion: h })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <BedDouble size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    Hab. {h.numero} <span className="text-muted-foreground">· {h.tipo}</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {mesasFiltradas.length > 0 && (
            <div className="border-b border-border py-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Mesas
              </p>
              {mesasFiltradas.map((m) => (
                <button
                  key={m.id_mesa}
                  onClick={() => verDetalle({ tipo: 'mesa', mesa: m })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <LayoutGrid size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">{m.nombre}</span>
                </button>
              ))}
            </div>
          )}

          {(productosBarFiltrados.length > 0 || productosRestauranteFiltrados.length > 0) && (
            <div className="border-b border-border py-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Productos
              </p>
              {productosBarFiltrados.map((p) => (
                <button
                  key={`bar-${p.id_producto}`}
                  onClick={() => verDetalle({ tipo: 'producto', origen: 'BAR', producto: p })}
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <UtensilsCrossed size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {p.nombre} <span className="text-muted-foreground">· Bar</span>
                  </span>
                </button>
              ))}
              {productosRestauranteFiltrados.map((p) => (
                <button
                  key={`rest-${p.id_producto}`}
                  onClick={() =>
                    verDetalle({ tipo: 'producto', origen: 'RESTAURANTE', producto: p })
                  }
                  className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <UtensilsCrossed size={14} className="shrink-0 text-muted-foreground" />
                  <span className="truncate">
                    {p.nombre} <span className="text-muted-foreground">· Restaurante</span>
                  </span>
                </button>
              ))}
            </div>
          )}

          {huespedes.length > 0 && (
            <div className="py-1.5">
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Huespedes
              </p>
              {huespedes.map((h) => (
                <button
                  key={h.id_huesped}
                  onClick={() => verDetalle({ tipo: 'huesped', huesped: h })}
                  className="flex w-full items-start gap-2 px-3 py-1.5 text-left text-sm hover:bg-secondary"
                >
                  <UserRound size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{h.nombre}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      CC {h.cedula} · {h.contacto}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="mb-4 flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-semibold text-card-foreground">
                {detalle.tipo === 'habitacion' && `Habitacion ${detalle.habitacion.numero}`}
                {detalle.tipo === 'mesa' && detalle.mesa.nombre}
                {detalle.tipo === 'producto' && detalle.producto.nombre}
                {detalle.tipo === 'huesped' && detalle.huesped.nombre}
              </h3>
              <button
                onClick={() => setDetalle(null)}
                className="shrink-0 text-xs text-muted-foreground hover:underline"
              >
                Cerrar
              </button>
            </div>

            {detalle.tipo === 'habitacion' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Fila etiqueta="Tipo" valor={detalle.habitacion.tipo} />
                  <Badge tono={TONO_ESTADO_HABITACION[detalle.habitacion.estado]}>
                    {LABEL_ESTADO_HABITACION[detalle.habitacion.estado]}
                  </Badge>
                </div>
                <Fila etiqueta="Piso" valor={detalle.habitacion.piso} />

                {detalle.habitacion.reserva_activa && (
                  <div className="rounded-md border border-border bg-secondary/40 p-2.5 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Huesped actual
                    </p>
                    <p className="font-medium text-foreground">
                      {detalle.habitacion.reserva_activa.huesped.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      CC {detalle.habitacion.reserva_activa.huesped.cedula} ·{' '}
                      {detalle.habitacion.reserva_activa.huesped.contacto}
                    </p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {detalle.habitacion.reserva_activa.fecha_checkin_prevista} →{' '}
                      {detalle.habitacion.reserva_activa.fecha_checkout_prevista}
                    </p>
                  </div>
                )}

                <div>
                  <p className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Calendar size={12} /> Proximas reservas
                  </p>
                  {cargandoProximas && (
                    <p className="text-sm text-muted-foreground">Cargando...</p>
                  )}
                  {!cargandoProximas && proximasReservas?.length === 0 && (
                    <p className="text-sm text-muted-foreground">Sin reservas proximas.</p>
                  )}
                  {!cargandoProximas && proximasReservas && proximasReservas.length > 0 && (
                    <ul className="space-y-1">
                      {proximasReservas.map((r) => (
                        <li key={r.id_reserva} className="text-sm">
                          <span className="font-medium text-foreground">{r.huesped.nombre}</span>{' '}
                          <span className="text-muted-foreground">
                            · {r.fecha_checkin_prevista} → {r.fecha_checkout_prevista}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <button
                  onClick={() => irAHabitacion(detalle.habitacion.id_habitacion)}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Ir a Habitaciones
                </button>
              </div>
            )}

            {detalle.tipo === 'mesa' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Fila etiqueta="Capacidad" valor={`${detalle.mesa.capacidad} pax`} />
                  <Badge tono={detalle.mesa.pedido_activo ? 'info' : 'exito'}>
                    {detalle.mesa.pedido_activo
                      ? LABEL_ESTADO_PEDIDO[detalle.mesa.pedido_activo.estado]
                      : 'Libre'}
                  </Badge>
                </div>

                {detalle.mesa.pedido_activo && (
                  <div className="rounded-md border border-border bg-secondary/40 p-2.5 text-sm">
                    <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Pedido activo
                    </p>
                    <Fila
                      etiqueta="Items"
                      valor={detalle.mesa.pedido_activo.items.reduce(
                        (suma, i) => suma + i.cantidad,
                        0,
                      )}
                    />
                    <Fila
                      etiqueta="Total"
                      valor={formatoMoneda.format(detalle.mesa.pedido_activo.total)}
                    />
                  </div>
                )}

                <button
                  onClick={() => irAMesa(detalle.mesa.id_mesa)}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Ir a Mesas
                </button>
              </div>
            )}

            {detalle.tipo === 'producto' && (
              <div className="space-y-3">
                <Fila
                  etiqueta="Precio de venta"
                  valor={formatoMoneda.format(detalle.producto.precio_venta)}
                />
                {detalle.origen === 'BAR' && (
                  <Fila
                    etiqueta="Stock"
                    valor={(detalle.producto as ProductoBar).stock}
                  />
                )}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Estado</span>
                  <Badge tono={detalle.producto.activo ? 'exito' : 'neutral'}>
                    {detalle.producto.activo ? 'Activo' : 'Inactivo'}
                  </Badge>
                </div>
                <button
                  onClick={() => irAProducto(detalle.origen, detalle.producto.nombre)}
                  className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                >
                  Ir a {detalle.origen === 'BAR' ? 'Productos Bar' : 'Productos restaurante'}
                </button>
              </div>
            )}

            {detalle.tipo === 'huesped' && (
              <div className="space-y-3">
                <Fila etiqueta="Cedula" valor={detalle.huesped.cedula} />
                <Fila etiqueta="Contacto" valor={detalle.huesped.contacto} />
                {detalle.huesped.placa && <Fila etiqueta="Placa" valor={detalle.huesped.placa} />}

                {(() => {
                  const habitacion = habitacionDeHuesped(detalle.huesped)
                  return habitacion ? (
                    <div className="rounded-md border border-border bg-secondary/40 p-2.5 text-sm">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Hospedado actualmente
                      </p>
                      <p className="font-medium text-foreground">
                        Habitacion {habitacion.numero} · {habitacion.tipo}
                      </p>
                      <button
                        onClick={() => irAHabitacion(habitacion.id_habitacion)}
                        className="mt-2 w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
                      >
                        Ir a su habitacion
                      </button>
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No tiene una habitacion activa en este momento.
                    </p>
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
