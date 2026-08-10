import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { listarReservas } from './api'
import type { EstadoReserva, Habitacion, Reserva } from './types'

const ANCHO_DIA = 40
const ANCHO_ETIQUETA = 132

const NOMBRE_MES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]
const DIA_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const TONO_ESTADO: Partial<Record<EstadoReserva, keyof typeof ESTILO_TONO>> = {
  RESERVADA: 'info',
  CHECK_IN: 'peligro',
  CHECK_OUT: 'neutral',
}

function pad(n: number): string {
  return String(n).padStart(2, '0')
}

function aISO(anio: number, mes: number, dia: number): string {
  return `${anio}-${pad(mes + 1)}-${pad(dia)}`
}

function hoyISO(): string {
  const d = new Date()
  return aISO(d.getFullYear(), d.getMonth(), d.getDate())
}

interface Props {
  habitaciones: Habitacion[]
  onSeleccionar: (idHabitacion: number) => void
}

export function CalendarioReservas({ habitaciones, onSeleccionar }: Props) {
  const hoy = new Date()
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [mes, setMes] = useState(hoy.getMonth())
  const [reservas, setReservas] = useState<Reserva[]>([])
  const [cargando, setCargando] = useState(true)

  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const dias = useMemo(() => Array.from({ length: diasEnMes }, (_, i) => i + 1), [diasEnMes])
  const desde = aISO(anio, mes, 1)
  const hasta = aISO(anio, mes, diasEnMes)

  useEffect(() => {
    setCargando(true)
    listarReservas({ desde, hasta })
      .then((datos) => setReservas(datos.filter((r) => r.estado !== 'CANCELADA')))
      .catch(() => setReservas([]))
      .finally(() => setCargando(false))
  }, [desde, hasta])

  const reservasPorHabitacion = useMemo(() => {
    const mapa = new Map<number, Reserva[]>()
    for (const r of reservas) {
      const lista = mapa.get(r.id_habitacion) ?? []
      lista.push(r)
      mapa.set(r.id_habitacion, lista)
    }
    return mapa
  }, [reservas])

  const cambiarMes = (delta: number) => {
    const fecha = new Date(anio, mes + delta, 1)
    setAnio(fecha.getFullYear())
    setMes(fecha.getMonth())
  }

  const irAHoy = () => {
    setAnio(hoy.getFullYear())
    setMes(hoy.getMonth())
  }

  const hoyIso = hoyISO()
  const habitacionesOrdenadas = [...habitaciones].sort((a, b) => a.numero.localeCompare(b.numero))

  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-1">
          <button
            onClick={() => cambiarMes(-1)}
            aria-label="Mes anterior"
            className="rounded-md p-1.5 hover:bg-secondary"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            onClick={() => cambiarMes(1)}
            aria-label="Mes siguiente"
            className="rounded-md p-1.5 hover:bg-secondary"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <span className="font-serif text-base font-semibold text-foreground">
          {NOMBRE_MES[mes]} {anio}
        </span>
        <button
          onClick={irAHoy}
          className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-secondary"
        >
          Hoy
        </button>
      </div>

      {cargando ? (
        <p className="p-4 text-sm text-muted-foreground">Cargando calendario...</p>
      ) : (
        <div className="overflow-x-auto">
          <div style={{ minWidth: ANCHO_ETIQUETA + diasEnMes * ANCHO_DIA }}>
            <div className="flex border-b border-border">
              <div
                className="sticky left-0 z-10 shrink-0 border-r border-border bg-card px-2 py-1.5 text-xs font-semibold text-muted-foreground"
                style={{ width: ANCHO_ETIQUETA }}
              >
                Habitacion
              </div>
              {dias.map((dia) => {
                const iso = aISO(anio, mes, dia)
                const esHoy = iso === hoyIso
                const diaSemana = new Date(anio, mes, dia).getDay()
                return (
                  <div
                    key={dia}
                    style={{ width: ANCHO_DIA }}
                    className={`shrink-0 border-l border-border/60 py-1 text-center text-[10px] ${
                      esHoy ? 'bg-primary/10 font-bold text-primary' : 'text-muted-foreground'
                    }`}
                  >
                    <div>{DIA_SEMANA[diaSemana]}</div>
                    <div>{dia}</div>
                  </div>
                )
              })}
            </div>

            {habitacionesOrdenadas.map((habitacion) => (
              <div key={habitacion.id_habitacion} className="flex border-b border-border/60">
                <button
                  onClick={() => onSeleccionar(habitacion.id_habitacion)}
                  className="sticky left-0 z-10 shrink-0 truncate border-r border-border bg-card px-2 py-2 text-left text-xs font-medium text-foreground hover:bg-secondary"
                  style={{ width: ANCHO_ETIQUETA }}
                >
                  {habitacion.numero} · {habitacion.tipo}
                </button>
                <div className="relative" style={{ width: diasEnMes * ANCHO_DIA, height: 36 }}>
                  {(reservasPorHabitacion.get(habitacion.id_habitacion) ?? []).map((reserva) => {
                    const inicioMes = new Date(anio, mes, 1)
                    const finMesExclusivo = new Date(anio, mes + 1, 1)
                    const checkin = new Date(`${reserva.fecha_checkin_prevista}T00:00:00`)
                    const checkout = new Date(`${reserva.fecha_checkout_prevista}T00:00:00`)
                    const inicioVisible = checkin < inicioMes ? inicioMes : checkin
                    const finVisible = checkout > finMesExclusivo ? finMesExclusivo : checkout
                    const offsetDias = Math.round(
                      (inicioVisible.getTime() - inicioMes.getTime()) / 86400000,
                    )
                    const anchoDias = Math.max(
                      1,
                      Math.round((finVisible.getTime() - inicioVisible.getTime()) / 86400000),
                    )
                    const tono = TONO_ESTADO[reserva.estado] ?? 'neutral'
                    return (
                      <button
                        key={reserva.id_reserva}
                        onClick={() => onSeleccionar(habitacion.id_habitacion)}
                        title={`${reserva.huesped.nombre} · ${reserva.fecha_checkin_prevista} a ${reserva.fecha_checkout_prevista}`}
                        style={{
                          left: offsetDias * ANCHO_DIA + 2,
                          width: anchoDias * ANCHO_DIA - 4,
                          top: 4,
                          height: 28,
                        }}
                        className={`absolute truncate rounded-md px-1.5 text-left text-[10px] font-medium leading-[28px] shadow-sm hover:opacity-90 ${ESTILO_TONO[tono].badge}`}
                      >
                        {reserva.huesped.nombre}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}

            {habitacionesOrdenadas.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">No hay habitaciones creadas todavia.</p>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3 border-t border-border p-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${ESTILO_TONO.info.punto}`} /> Reservada
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${ESTILO_TONO.peligro.punto}`} /> Check-in
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-2.5 rounded-full ${ESTILO_TONO.neutral.punto}`} /> Check-out
        </span>
      </div>
    </div>
  )
}
