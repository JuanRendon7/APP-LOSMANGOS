import { BedDouble, CalendarClock, Coins, DoorOpen } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { listarVentas } from '@/features/caja/api'
import { listarHabitaciones, listarReservas } from '@/features/hospedaje/api'
import type { EstadoHabitacion, EstadoReserva, Habitacion, Reserva } from '@/features/hospedaje/types'
import { descargarExcel } from '@/shared/lib/excel'
import { Chip, formatoMoneda, StatCard } from './shared'

const ETIQUETAS_ESTADO_RESERVA: Record<EstadoReserva, string> = {
  RESERVADA: 'Reservada',
  CHECK_IN: 'Check-in',
  CHECK_OUT: 'Check-out',
  CANCELADA: 'Cancelada',
}

const ETIQUETAS_ESTADO_HABITACION: Record<EstadoHabitacion, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento',
}

const COLORES_DONUT = ['var(--color-primary)', 'var(--color-marca-300)']

type ClaveDetalle = 'ocupadas' | 'disponibles' | 'reservas' | null

interface Props {
  desde: string
  hasta: string
}

export function HotelTab({ desde, hasta }: Props) {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [ingresos, setIngresos] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandido, setExpandido] = useState<ClaveDetalle>(null)
  const [filtroEstado, setFiltroEstado] = useState<EstadoReserva | 'TODAS'>('TODAS')
  const [generando, setGenerando] = useState(false)

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      try {
        const [hab, res, ventas] = await Promise.all([
          listarHabitaciones(),
          listarReservas({ desde: desde || undefined, hasta: hasta || undefined }),
          listarVentas({ origen: 'HABITACION', desde: desde || undefined, hasta: hasta || undefined }),
        ])
        if (cancelado) return
        setHabitaciones(hab)
        setReservas(res)
        setIngresos(ventas.reduce((suma, v) => suma + v.monto, 0))
        setError(null)
      } catch {
        if (!cancelado) setError('No se pudo cargar el resumen de hotel.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [desde, hasta])

  const descargar = async () => {
    setError(null)
    setGenerando(true)
    try {
      if (reservas.length === 0) {
        setError('No hay reservas en ese rango de fechas.')
        return
      }
      const numeroPorHabitacion = new Map(habitaciones.map((h) => [h.id_habitacion, h.numero]))
      const filas = reservas.map((r) => [
        numeroPorHabitacion.get(r.id_habitacion) ?? String(r.id_habitacion),
        r.huesped.nombre,
        r.huesped.cedula,
        r.huesped.contacto,
        r.fecha_checkin_prevista,
        r.fecha_checkout_prevista,
        r.fecha_checkin_real,
        r.fecha_checkout_real,
        ETIQUETAS_ESTADO_RESERVA[r.estado] ?? r.estado,
        r.precio_total,
      ])
      await descargarExcel({
        nombreArchivo: `reservas${desde && hasta ? `_${desde}_a_${hasta}` : ''}.xlsx`,
        hoja: 'Reservas',
        titulo: 'Hotel Los Mangos · Reservas',
        subtitulo:
          desde || hasta
            ? `Rango: ${desde || 'inicio'} a ${hasta || 'hoy'}`
            : 'Sin rango de fechas: incluye todas las reservas',
        columnas: [
          { titulo: 'Habitacion', ancho: 12 },
          { titulo: 'Huesped', ancho: 24 },
          { titulo: 'Cedula', ancho: 14 },
          { titulo: 'Contacto', ancho: 16 },
          { titulo: 'Checkin previsto', formato: 'fecha' },
          { titulo: 'Checkout previsto', formato: 'fecha' },
          { titulo: 'Checkin real', formato: 'fechahora' },
          { titulo: 'Checkout real', formato: 'fechahora' },
          { titulo: 'Estado', ancho: 14 },
          { titulo: 'Total', formato: 'moneda', totalizar: true },
        ],
        filas,
      })
    } finally {
      setGenerando(false)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando resumen de hotel...</p>
  }

  const total = habitaciones.length
  const ocupadas = habitaciones.filter((h) => h.estado === 'OCUPADA').length
  const disponibles = habitaciones.filter((h) => h.estado === 'DISPONIBLE').length
  const porcentajeOcupacion = total > 0 ? Math.round((ocupadas / total) * 100) : 0
  const conCheckin = reservas.filter((r) => r.estado === 'CHECK_IN' || r.estado === 'CHECK_OUT').length

  const datosBarras = (['RESERVADA', 'CHECK_IN', 'CHECK_OUT', 'CANCELADA'] as EstadoReserva[]).map(
    (estado) => ({
      estado: ETIQUETAS_ESTADO_RESERVA[estado],
      cantidad: reservas.filter((r) => r.estado === estado).length,
    }),
  )
  const datosDonut = [
    { name: 'Ocupadas', value: ocupadas },
    { name: 'Disponibles y otras', value: total - ocupadas },
  ]

  const reservasFiltradas =
    filtroEstado === 'TODAS' ? reservas : reservas.filter((r) => r.estado === filtroEstado)
  const numeroPorHabitacion = new Map(habitaciones.map((h) => [h.id_habitacion, h.numero]))

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label="Ingresos por habitaciones"
          valor={formatoMoneda.format(ingresos)}
          sub={desde || hasta ? 'En el rango seleccionado' : 'Historico completo'}
        />
        <StatCard
          icon={CalendarClock}
          label="Reservas en el rango"
          valor={reservas.length}
          sub={`${conCheckin} con check-in`}
          onClick={() => setExpandido(expandido === 'reservas' ? null : 'reservas')}
          activo={expandido === 'reservas'}
        />
        <StatCard
          icon={DoorOpen}
          label="Ocupadas ahora"
          valor={ocupadas}
          sub={`${porcentajeOcupacion}% del total`}
          onClick={() => setExpandido(expandido === 'ocupadas' ? null : 'ocupadas')}
          activo={expandido === 'ocupadas'}
        />
        <StatCard
          icon={BedDouble}
          label="Disponibles ahora"
          valor={disponibles}
          sub="Listas para reservar"
          onClick={() => setExpandido(expandido === 'disponibles' ? null : 'disponibles')}
          activo={expandido === 'disponibles'}
        />
      </div>

      {expandido === 'reservas' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-serif text-base font-semibold text-foreground">Reservas en el rango</h2>
            <div className="flex flex-wrap gap-1.5">
              <Chip activo={filtroEstado === 'TODAS'} onClick={() => setFiltroEstado('TODAS')}>
                Todas
              </Chip>
              {(['RESERVADA', 'CHECK_IN', 'CHECK_OUT', 'CANCELADA'] as EstadoReserva[]).map((estado) => (
                <Chip
                  key={estado}
                  activo={filtroEstado === estado}
                  onClick={() => setFiltroEstado(estado)}
                >
                  {ETIQUETAS_ESTADO_RESERVA[estado]}
                </Chip>
              ))}
            </div>
          </div>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {reservasFiltradas.map((r) => (
              <li
                key={r.id_reserva}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 odd:bg-muted/40"
              >
                <span className="truncate">
                  {r.huesped.nombre} · Hab. {numeroPorHabitacion.get(r.id_habitacion) ?? '—'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ETIQUETAS_ESTADO_RESERVA[r.estado]} · {r.fecha_checkin_prevista} a{' '}
                  {r.fecha_checkout_prevista} · {formatoMoneda.format(r.precio_total)}
                </span>
              </li>
            ))}
            {reservasFiltradas.length === 0 && (
              <li className="text-sm text-muted-foreground">Sin reservas para este filtro.</li>
            )}
          </ul>
        </div>
      )}

      {expandido !== 'reservas' && expandido !== null && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
            {expandido === 'ocupadas' ? 'Habitaciones ocupadas' : 'Habitaciones disponibles'}
          </h2>
          <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
            {habitaciones
              .filter((h) => h.estado === (expandido === 'ocupadas' ? 'OCUPADA' : 'DISPONIBLE'))
              .sort((a, b) => a.numero.localeCompare(b.numero))
              .map((h) => (
                <li
                  key={h.id_habitacion}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 odd:bg-muted/40"
                >
                  <span>
                    {h.numero} · Piso {h.piso}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {h.reserva_activa ? h.reserva_activa.huesped.nombre : ETIQUETAS_ESTADO_HABITACION[h.estado]}
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">Reservas por estado</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosBarras}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                <XAxis dataKey="estado" tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="cantidad" name="Reservas" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">Ocupación actual</h2>
          <div className="relative h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={datosDonut}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={65}
                  outerRadius={95}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {datosDonut.map((entrada, indice) => (
                    <Cell key={entrada.name} fill={COLORES_DONUT[indice % COLORES_DONUT.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center pb-6">
              <span className="font-serif text-3xl font-bold text-foreground">{porcentajeOcupacion}%</span>
              <span className="text-xs text-muted-foreground">Ocupado</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-serif text-base font-semibold text-foreground">Exportar reservas</h2>
        <p className="text-xs text-muted-foreground">
          {desde || hasta
            ? `Rango: ${desde || 'inicio'} a ${hasta || 'hoy'} (usa el filtro de fechas de arriba para cambiarlo).`
            : 'Sin rango de fechas: se incluyen todas las reservas.'}
        </p>
        <button
          onClick={descargar}
          disabled={generando}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {generando ? 'Generando...' : 'Descargar Excel'}
        </button>
      </div>
    </div>
  )
}
