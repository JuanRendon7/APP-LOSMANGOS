import { BedDouble, LogIn, LogOut, Sparkles, UserRound, Wrench, type LucideIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { actualizarEstadoHabitacion, listarHabitaciones, listarReservas } from './api'
import { ReservaDetailPanel } from './ReservaDetailPanel'
import { ReservaFormModal } from './ReservaFormModal'
import type { EstadoHabitacion, Habitacion, Reserva } from './types'

interface EstadoConfig {
  label: string
  icon: LucideIcon
  accent: string
  badge: string
  dot: string
  chipActivo: string
}

const ESTADO_CONFIG: Record<EstadoHabitacion, EstadoConfig> = {
  DISPONIBLE: {
    label: 'Disponible',
    icon: BedDouble,
    accent: 'border-l-emerald-500',
    badge: 'bg-emerald-100 text-emerald-800',
    dot: 'bg-emerald-500',
    chipActivo: 'border-emerald-500 bg-emerald-50 text-emerald-800',
  },
  OCUPADA: {
    label: 'Ocupada',
    icon: UserRound,
    accent: 'border-l-blue-500',
    badge: 'bg-blue-100 text-blue-800',
    dot: 'bg-blue-500',
    chipActivo: 'border-blue-500 bg-blue-50 text-blue-800',
  },
  LIMPIEZA: {
    label: 'Limpieza',
    icon: Sparkles,
    accent: 'border-l-amber-500',
    badge: 'bg-amber-100 text-amber-800',
    dot: 'bg-amber-500',
    chipActivo: 'border-amber-500 bg-amber-50 text-amber-800',
  },
  MANTENIMIENTO: {
    label: 'Mantenimiento',
    icon: Wrench,
    accent: 'border-l-red-500',
    badge: 'bg-red-100 text-red-800',
    dot: 'bg-red-500',
    chipActivo: 'border-red-500 bg-red-50 text-red-800',
  },
}

const ORDEN_ESTADOS: EstadoHabitacion[] = ['DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENIMIENTO']

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HabitacionesPage() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(null)
  const [mostrarFormReserva, setMostrarFormReserva] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [filtro, setFiltro] = useState<EstadoHabitacion | 'TODAS'>('TODAS')
  const [llegadasHoy, setLlegadasHoy] = useState<Reserva[]>([])

  const recargar = useCallback(async () => {
    try {
      const datos = await listarHabitaciones()
      setHabitaciones(datos)
      setError(null)
      setRefreshToken((token) => token + 1)
    } catch {
      setError('No se pudieron cargar las habitaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  useEffect(() => {
    const hoy = hoyISO()
    listarReservas({ estado: 'RESERVADA', desde: hoy, hasta: hoy })
      .then((datos) => setLlegadasHoy(datos.filter((r) => r.fecha_checkin_prevista === hoy)))
      .catch(() => {})
  }, [refreshToken])

  const seleccionada = habitaciones.find((h) => h.id_habitacion === idSeleccionada) ?? null

  const cambiarEstado = async (habitacion: Habitacion, estado: string) => {
    try {
      await actualizarEstadoHabitacion(habitacion.id_habitacion, estado)
      await recargar()
    } catch {
      setError('No se pudo actualizar el estado de la habitacion.')
    }
  }

  const pisos = Array.from(new Set(habitaciones.map((h) => h.piso))).sort((a, b) => a - b)

  const conteos = useMemo(() => {
    const base: Record<EstadoHabitacion, number> = {
      DISPONIBLE: 0,
      OCUPADA: 0,
      LIMPIEZA: 0,
      MANTENIMIENTO: 0,
    }
    for (const h of habitaciones) base[h.estado] += 1
    return base
  }, [habitaciones])

  const hoy = hoyISO()
  const salidasHoy = habitaciones.filter(
    (h) => h.estado === 'OCUPADA' && h.reserva_activa?.fecha_checkout_prevista === hoy,
  )

  const ocupacion = habitaciones.length > 0 ? Math.round((conteos.OCUPADA / habitaciones.length) * 100) : 0

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando habitaciones...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Habitaciones</h1>
        <p className="text-sm text-muted-foreground">
          {habitaciones.length} habitaciones en {pisos.length} pisos · {ocupacion}% ocupacion
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFiltro('TODAS')}
          className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            filtro === 'TODAS'
              ? 'border-primary bg-primary text-primary-foreground'
              : 'border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          Todas · {habitaciones.length}
        </button>
        {ORDEN_ESTADOS.map((estado) => {
          const cfg = ESTADO_CONFIG[estado]
          const Icono = cfg.icon
          return (
            <button
              key={estado}
              onClick={() => setFiltro(filtro === estado ? 'TODAS' : estado)}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                filtro === estado ? cfg.chipActivo : 'border-border text-muted-foreground hover:bg-secondary'
              }`}
            >
              <Icono size={14} />
              {cfg.label} · {conteos[estado]}
            </button>
          )
        })}
      </div>

      {(salidasHoy.length > 0 || llegadasHoy.length > 0) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {salidasHoy.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <LogOut size={14} /> Salidas de hoy
              </div>
              <ul className="space-y-1.5">
                {salidasHoy.map((h) => (
                  <li key={h.id_habitacion}>
                    <button
                      onClick={() => setIdSeleccionada(h.id_habitacion)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-secondary"
                    >
                      <span className="font-medium text-foreground">Hab. {h.numero}</span>
                      <span className="truncate text-muted-foreground">
                        {h.reserva_activa?.huesped.nombre}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {llegadasHoy.length > 0 && (
            <div className="rounded-lg border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <LogIn size={14} /> Llegadas de hoy
              </div>
              <ul className="space-y-1.5">
                {llegadasHoy.map((r) => (
                  <li key={r.id_reserva}>
                    <button
                      onClick={() => setIdSeleccionada(r.id_habitacion)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-secondary"
                    >
                      <span className="font-medium text-foreground">
                        Hab. {habitaciones.find((h) => h.id_habitacion === r.id_habitacion)?.numero}
                      </span>
                      <span className="truncate text-muted-foreground">{r.huesped.nombre}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {pisos.map((piso) => {
        const habitacionesPiso = habitaciones
          .filter((h) => h.piso === piso)
          .filter((h) => filtro === 'TODAS' || h.estado === filtro)
        if (habitacionesPiso.length === 0) return null
        return (
          <div key={piso} className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground">Piso {piso}</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {habitacionesPiso.map((habitacion) => {
                const cfg = ESTADO_CONFIG[habitacion.estado]
                const Icono = cfg.icon
                const saleHoy = habitacion.reserva_activa?.fecha_checkout_prevista === hoy
                return (
                  <button
                    key={habitacion.id_habitacion}
                    onClick={() => setIdSeleccionada(habitacion.id_habitacion)}
                    className={`rounded-lg border border-l-4 bg-card p-3 text-left shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${cfg.accent} ${
                      idSeleccionada === habitacion.id_habitacion
                        ? 'border-border ring-2 ring-ring'
                        : 'border-border'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between">
                      <span className="font-serif text-xl font-semibold text-card-foreground">
                        {habitacion.numero}
                      </span>
                      <Icono size={16} className="text-muted-foreground" />
                    </div>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
                    >
                      {cfg.label}
                    </span>
                    {habitacion.reserva_activa && (
                      <div className="mt-1.5 truncate text-xs text-muted-foreground">
                        {habitacion.reserva_activa.huesped.nombre}
                      </div>
                    )}
                    {saleHoy && (
                      <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-medium text-red-800">
                        <LogOut size={10} /> Sale hoy
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {seleccionada && (
        <ReservaDetailPanel
          habitacion={seleccionada}
          refreshToken={refreshToken}
          onCerrar={() => setIdSeleccionada(null)}
          onCambiarEstado={(estado) => cambiarEstado(seleccionada, estado)}
          onNuevaReserva={() => setMostrarFormReserva(true)}
          onActualizado={recargar}
        />
      )}

      {mostrarFormReserva && seleccionada && (
        <ReservaFormModal
          habitacion={seleccionada}
          onCerrar={() => setMostrarFormReserva(false)}
          onCreada={() => {
            setMostrarFormReserva(false)
            recargar()
          }}
        />
      )}
    </div>
  )
}
