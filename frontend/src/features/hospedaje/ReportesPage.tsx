import { Beer, BedDouble, CalendarClock, DoorOpen, UtensilsCrossed, type LucideIcon } from 'lucide-react'
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
import { useNavigate } from 'react-router'
import { listarProductosBar, listarProductosRestaurante } from '@/features/productos/api'
import { cn } from '@/shared/lib/utils'
import { listarHabitaciones, listarReservas } from './api'
import type { EstadoHabitacion, EstadoReserva, Habitacion, Reserva } from './types'

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

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

const COLORES_DONUT = ['var(--color-primary)', 'var(--color-marca-400)']

type ClaveDetalle = 'total' | 'ocupadas' | 'disponibles' | 'reservas'

interface StatCardProps {
  icon: LucideIcon
  label: string
  valor: string | number
  sub: string
  onClick: () => void
  activo?: boolean
}

function StatCard({ icon: Icono, label, valor, sub, onClick, activo }: StatCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left transition-colors hover:border-primary/50',
        activo ? 'border-primary ring-1 ring-primary' : 'border-border',
      )}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
        <Icono size={18} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground">{valor}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>
    </button>
  )
}

export function ReportesPage() {
  const navigate = useNavigate()
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [productosRestaurante, setProductosRestaurante] = useState(0)
  const [productosBar, setProductosBar] = useState(0)
  const [cargandoResumen, setCargandoResumen] = useState(true)
  const [expandido, setExpandido] = useState<ClaveDetalle | null>(null)

  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)

  const alternar = (clave: ClaveDetalle) =>
    setExpandido((actual) => (actual === clave ? null : clave))

  useEffect(() => {
    async function cargar() {
      try {
        const [hab, res, pRestaurante, pBar] = await Promise.all([
          listarHabitaciones(),
          listarReservas({}),
          listarProductosRestaurante(),
          listarProductosBar(),
        ])
        setHabitaciones(hab)
        setReservas(res)
        setProductosRestaurante(pRestaurante.filter((p) => p.activo).length)
        setProductosBar(pBar.filter((p) => p.activo).length)
      } catch {
        setError('No se pudo cargar el resumen de la operación.')
      } finally {
        setCargandoResumen(false)
      }
    }
    cargar()
  }, [])

  const descargar = async () => {
    setError(null)
    setGenerando(true)
    try {
      const [reservasDescarga, habitacionesDescarga] = await Promise.all([
        listarReservas({ desde: desde || undefined, hasta: hasta || undefined }),
        listarHabitaciones(),
      ])
      if (reservasDescarga.length === 0) {
        setError('No hay reservas en ese rango de fechas.')
        return
      }

      const numeroPorHabitacion = new Map(
        habitacionesDescarga.map((h) => [h.id_habitacion, h.numero]),
      )
      const encabezados = [
        'Habitacion',
        'Huesped',
        'Cedula',
        'Contacto',
        'Checkin previsto',
        'Checkout previsto',
        'Checkin real',
        'Checkout real',
        'Estado',
        'Total',
      ]
      const filas = reservasDescarga.map((r) => [
        numeroPorHabitacion.get(r.id_habitacion) ?? String(r.id_habitacion),
        r.huesped.nombre,
        r.huesped.cedula,
        r.huesped.contacto,
        r.fecha_checkin_prevista,
        r.fecha_checkout_prevista,
        r.fecha_checkin_real ?? '',
        r.fecha_checkout_real ?? '',
        ETIQUETAS_ESTADO_RESERVA[r.estado] ?? r.estado,
        String(r.precio_total),
      ])
      const contenido = [encabezados, ...filas]
        .map((fila) => fila.map(escaparCsv).join(','))
        .join('\n')
      const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const sufijo = desde && hasta ? `_${desde}_a_${hasta}` : ''
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `reservas${sufijo}.csv`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setGenerando(false)
    }
  }

  const total = habitaciones.length
  const ocupadas = habitaciones.filter((h) => h.estado === 'OCUPADA').length
  const disponibles = habitaciones.filter((h) => h.estado === 'DISPONIBLE').length
  const reservasActivas = reservas.filter(
    (r) => r.estado === 'RESERVADA' || r.estado === 'CHECK_IN',
  ).length
  const porcentajeOcupacion = total > 0 ? Math.round((ocupadas / total) * 100) : 0

  const datosBarras = (
    ['RESERVADA', 'CHECK_IN', 'CHECK_OUT', 'CANCELADA'] as EstadoReserva[]
  ).map((estado) => ({
    estado: ETIQUETAS_ESTADO_RESERVA[estado],
    cantidad: reservas.filter((r) => r.estado === estado).length,
  }))

  const datosDonut = [
    { name: 'Ocupadas', value: ocupadas },
    { name: 'Disponibles y otras', value: total - ocupadas },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Resumen de la operación y descarga de reservas por fechas.
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {cargandoResumen ? (
        <p className="text-sm text-muted-foreground">Cargando resumen...</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={BedDouble}
              label="Habitaciones totales"
              valor={total}
              sub="Piso 1 y piso 2"
              onClick={() => alternar('total')}
              activo={expandido === 'total'}
            />
            <StatCard
              icon={DoorOpen}
              label="Ocupadas"
              valor={ocupadas}
              sub={`${porcentajeOcupacion}% del total`}
              onClick={() => alternar('ocupadas')}
              activo={expandido === 'ocupadas'}
            />
            <StatCard
              icon={BedDouble}
              label="Disponibles"
              valor={disponibles}
              sub="Listas para reservar"
              onClick={() => alternar('disponibles')}
              activo={expandido === 'disponibles'}
            />
            <StatCard
              icon={CalendarClock}
              label="Reservas activas"
              valor={reservasActivas}
              sub="Reservadas o con check-in"
              onClick={() => alternar('reservas')}
              activo={expandido === 'reservas'}
            />
          </div>

          {expandido && (
            <DetalleKpi
              clave={expandido}
              habitaciones={habitaciones}
              reservas={reservas}
              onVerHabitaciones={() => navigate('/habitaciones')}
            />
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">Reservas por estado</h2>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={datosBarras}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis
                      dataKey="estado"
                      tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    />
                    <YAxis
                      allowDecimals={false}
                      tick={{ fontSize: 12, fill: 'var(--color-muted-foreground)' }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: 'var(--color-card)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                    <Bar
                      dataKey="cantidad"
                      name="Reservas"
                      fill="var(--color-primary)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-4">
              <h2 className="mb-3 text-sm font-semibold text-foreground">
                Ocupación de habitaciones
              </h2>
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
                        <Cell
                          key={entrada.name}
                          fill={COLORES_DONUT[indice % COLORES_DONUT.length]}
                        />
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
                  <span className="text-2xl font-bold text-foreground">
                    {porcentajeOcupacion}%
                  </span>
                  <span className="text-xs text-muted-foreground">Ocupado</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard
              icon={UtensilsCrossed}
              label="Productos restaurante"
              valor={productosRestaurante}
              sub="Activos en el menu"
              onClick={() => navigate('/productos/restaurante')}
            />
            <StatCard
              icon={Beer}
              label="Productos bar"
              valor={productosBar}
              sub="Activos en el catalogo"
              onClick={() => navigate('/productos/bar')}
            />
          </div>
        </>
      )}

      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="text-sm font-semibold text-foreground">Exportar reservas</h2>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="desde" className="mb-1 block text-sm font-medium text-foreground">
              Desde
            </label>
            <input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="hasta" className="mb-1 block text-sm font-medium text-foreground">
              Hasta
            </label>
            <input
              id="hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        <button
          onClick={descargar}
          disabled={generando}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {generando ? 'Generando...' : 'Descargar CSV'}
        </button>
        <p className="text-xs text-muted-foreground">
          Si dejas las fechas vacias, se incluyen todas las reservas.
        </p>
      </div>
    </div>
  )
}

function DetalleKpi({
  clave,
  habitaciones,
  reservas,
  onVerHabitaciones,
}: {
  clave: ClaveDetalle
  habitaciones: Habitacion[]
  reservas: Reserva[]
  onVerHabitaciones: () => void
}) {
  const numeroPorHabitacion = new Map(habitaciones.map((h) => [h.id_habitacion, h.numero]))

  const titulos: Record<ClaveDetalle, string> = {
    total: 'Todas las habitaciones',
    ocupadas: 'Habitaciones ocupadas',
    disponibles: 'Habitaciones disponibles',
    reservas: 'Reservas activas',
  }

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-foreground">{titulos[clave]}</h2>
        {clave !== 'reservas' && (
          <button
            onClick={onVerHabitaciones}
            className="text-xs font-medium text-primary hover:underline"
          >
            Ir a Habitaciones
          </button>
        )}
      </div>

      {clave === 'reservas' ? (
        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
          {reservas
            .filter((r) => r.estado === 'RESERVADA' || r.estado === 'CHECK_IN')
            .map((r) => (
              <li
                key={r.id_reserva}
                className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 odd:bg-muted/40"
              >
                <span className="truncate">
                  {r.huesped.nombre} · Hab. {numeroPorHabitacion.get(r.id_habitacion) ?? '—'}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {ETIQUETAS_ESTADO_RESERVA[r.estado]} · {r.fecha_checkin_prevista} a{' '}
                  {r.fecha_checkout_prevista}
                </span>
              </li>
            ))}
          {reservas.filter((r) => r.estado === 'RESERVADA' || r.estado === 'CHECK_IN').length ===
            0 && <li className="text-sm text-muted-foreground">Sin reservas activas.</li>}
        </ul>
      ) : (
        <ul className="max-h-72 space-y-1 overflow-y-auto text-sm">
          {habitaciones
            .filter((h) => {
              if (clave === 'ocupadas') return h.estado === 'OCUPADA'
              if (clave === 'disponibles') return h.estado === 'DISPONIBLE'
              return true
            })
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
                  {h.reserva_activa
                    ? h.reserva_activa.huesped.nombre
                    : ETIQUETAS_ESTADO_HABITACION[h.estado]}
                </span>
              </li>
            ))}
        </ul>
      )}
    </div>
  )
}
