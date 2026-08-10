import {
  BedDouble,
  Calendar,
  LayoutGrid,
  LogIn,
  LogOut,
  Sparkles,
  UserRound,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { actualizarEstadoHabitacion, listarHabitaciones, listarReservas } from './api'
import { CalendarioReservas } from './CalendarioReservas'
import { ReservaDetailPanel } from './ReservaDetailPanel'
import { ReservaFormModal } from './ReservaFormModal'
import type { EstadoHabitacion, Habitacion, Reserva } from './types'

interface EstadoConfig {
  label: string
  icon: LucideIcon
  marco: string
  badge: string
  chipActivo: string
}

const ESTADO_CONFIG: Record<EstadoHabitacion, EstadoConfig> = {
  DISPONIBLE: { label: 'Disponible', icon: BedDouble, ...ESTILO_TONO.exito },
  OCUPADA: { label: 'Ocupada', icon: UserRound, ...ESTILO_TONO.peligro },
  LIMPIEZA: { label: 'Limpieza', icon: Sparkles, ...ESTILO_TONO.amarillo },
  MANTENIMIENTO: { label: 'Mantenimiento', icon: Wrench, ...ESTILO_TONO.alerta },
}

function PuertaIlustrada({
  numero,
  cfg,
  seleccionada,
}: {
  numero: string
  cfg: EstadoConfig
  seleccionada: boolean
}) {
  const Icono = cfg.icon
  return (
    <div
      className={`relative aspect-[4/5] w-full overflow-hidden rounded-t-lg rounded-b-sm border-2 shadow-sm transition-shadow ${cfg.marco} ${
        seleccionada ? 'ring-4 ring-ring ring-offset-2 ring-offset-background' : ''
      }`}
      style={{
        background:
          'radial-gradient(circle at 30% 22%, var(--color-marca-100), var(--color-marca-300) 60%, var(--color-marca-500) 100%)',
      }}
    >
      <div
        className="absolute inset-2.5 rounded-md border"
        style={{ borderColor: 'var(--color-marca-600)', opacity: 0.18 }}
      />
      <div className="absolute left-1/2 top-2.5 -translate-x-1/2 rounded-md border border-marca-300 bg-marca-50 px-2 py-0.5 shadow-sm">
        <span className="font-serif text-sm font-bold leading-none text-marca-900">{numero}</span>
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-center leading-tight text-mango-700 opacity-80">
        <span className="block font-serif text-[9px] italic tracking-[0.15em]">Hotel</span>
        <span className="block text-[7px] font-semibold uppercase tracking-[0.2em]">Los Mangos</span>
      </div>
      <div
        className="absolute right-2.5 top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full shadow"
        style={{
          background: 'radial-gradient(circle at 35% 30%, var(--color-oro-300), var(--color-oro-600))',
        }}
      />
      <div
        className={`absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-background shadow ${cfg.badge}`}
      >
        <Icono size={12} />
      </div>
    </div>
  )
}

const ORDEN_ESTADOS: EstadoHabitacion[] = ['DISPONIBLE', 'OCUPADA', 'LIMPIEZA', 'MANTENIMIENTO']

function hoyISO(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function HabitacionesPage() {
  const [searchParams] = useSearchParams()
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(() => {
    const id = searchParams.get('id')
    return id ? Number(id) : null
  })
  const [mostrarFormReserva, setMostrarFormReserva] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)
  const [filtro, setFiltro] = useState<EstadoHabitacion | 'TODAS'>('TODAS')
  const [vista, setVista] = useState<'PUERTAS' | 'CALENDARIO'>('PUERTAS')
  const [llegadasHoy, setLlegadasHoy] = useState<Reserva[]>([])
  const panelRef = useRef<HTMLDivElement>(null)

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

  useEffect(() => {
    if (idSeleccionada !== null) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [idSeleccionada])

  // La busqueda global navega con ?id=, pero si ya estabamos en esta pagina
  // React Router no vuelve a montar el componente (mismo path) — sin este
  // efecto, el useState inicial (que solo lee la URL una vez) nunca se entera
  // de un ?id= que cambia despues.
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) setIdSeleccionada(Number(id))
  }, [searchParams])

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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Habitaciones</h1>
          <p className="text-sm text-muted-foreground">
            {habitaciones.length} habitaciones en {pisos.length} pisos · {ocupacion}% ocupacion
          </p>
        </div>
        <div className="flex rounded-md border border-border p-0.5">
          <button
            onClick={() => setVista('PUERTAS')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              vista === 'PUERTAS' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <LayoutGrid size={14} /> Puertas
          </button>
          <button
            onClick={() => setVista('CALENDARIO')}
            className={`flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition-colors ${
              vista === 'CALENDARIO' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
            }`}
          >
            <Calendar size={14} /> Calendario
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {seleccionada && (
        <div ref={panelRef} className="scroll-mt-20">
          <ReservaDetailPanel
            habitacion={seleccionada}
            refreshToken={refreshToken}
            onCerrar={() => setIdSeleccionada(null)}
            onCambiarEstado={(estado) => cambiarEstado(seleccionada, estado)}
            onNuevaReserva={() => setMostrarFormReserva(true)}
            onActualizado={recargar}
          />
        </div>
      )}

      {vista === 'CALENDARIO' && (
        <CalendarioReservas habitaciones={habitaciones} onSeleccionar={setIdSeleccionada} />
      )}

      {vista === 'PUERTAS' && (
      <>
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
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 lg:grid-cols-6">
              {habitacionesPiso.map((habitacion) => {
                const cfg = ESTADO_CONFIG[habitacion.estado]
                const saleHoy = habitacion.reserva_activa?.fecha_checkout_prevista === hoy
                return (
                  <button
                    key={habitacion.id_habitacion}
                    onClick={() => setIdSeleccionada(habitacion.id_habitacion)}
                    className="group flex flex-col text-left transition-transform hover:-translate-y-1"
                  >
                    <PuertaIlustrada
                      numero={habitacion.numero}
                      cfg={cfg}
                      seleccionada={idSeleccionada === habitacion.id_habitacion}
                    />
                    <div className="space-y-1 rounded-b-lg border border-t-0 border-border bg-card px-2 py-1.5">
                      <div className="truncate text-[10px] font-medium text-muted-foreground">
                        {habitacion.tipo}
                      </div>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${cfg.badge}`}
                      >
                        {cfg.label}
                      </span>
                      {habitacion.reserva_activa && (
                        <div className="truncate text-xs text-muted-foreground">
                          {habitacion.reserva_activa.huesped.nombre}
                        </div>
                      )}
                      {saleHoy && (
                        <div className="inline-flex items-center gap-1 rounded-full bg-alerta-100 px-1.5 py-0.5 text-[10px] font-medium text-alerta-800">
                          <LogOut size={10} /> Sale hoy
                        </div>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      </>
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
