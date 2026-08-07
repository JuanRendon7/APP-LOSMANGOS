import { useCallback, useEffect, useState } from 'react'
import { cobrarHabitacion } from '@/features/caja/api'
import type { MetodoPago } from '@/features/caja/types'
import { ConsumoPanel } from '@/features/consumo/ConsumoPanel'
import { useAuth } from '@/shared/auth/AuthContext'
import { cancelarReserva, checkIn, listarReservas } from './api'
import type { Habitacion, Reserva } from './types'

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

interface Props {
  habitacion: Habitacion
  refreshToken: number
  onCerrar: () => void
  onCambiarEstado: (estado: string) => void
  onNuevaReserva: () => void
  onActualizado: () => Promise<void> | void
}

export function ReservaDetailPanel({
  habitacion,
  refreshToken,
  onCerrar,
  onCambiarEstado,
  onNuevaReserva,
  onActualizado,
}: Props) {
  const { tienePermiso } = useAuth()
  const [proximas, setProximas] = useState<Reserva[]>([])
  const [cargandoProximas, setCargandoProximas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO')
  const [cobrando, setCobrando] = useState(false)

  const cargarProximas = useCallback(async () => {
    if (habitacion.estado === 'OCUPADA') {
      setProximas([])
      return
    }
    setCargandoProximas(true)
    try {
      const datos = await listarReservas({
        idHabitacion: habitacion.id_habitacion,
        estado: 'RESERVADA',
      })
      setProximas(datos)
    } catch {
      setError('No se pudieron cargar las proximas reservas.')
    } finally {
      setCargandoProximas(false)
    }
  }, [habitacion.estado, habitacion.id_habitacion, refreshToken])

  useEffect(() => {
    cargarProximas()
  }, [cargarProximas])

  const puedeEditarReservas = tienePermiso('RESERVAS', 'EDITAR')
  const puedeCrearReservas = tienePermiso('RESERVAS', 'CREAR')
  const puedeEditarHabitaciones = tienePermiso('HABITACIONES', 'EDITAR')

  const manejarCheckIn = async (idReserva: number) => {
    try {
      await checkIn(idReserva)
      await onActualizado()
    } catch {
      setError('No se pudo hacer check-in.')
    }
  }

  const manejarCheckOut = async () => {
    if (!habitacion.reserva_activa) return
    setError(null)
    setCobrando(true)
    try {
      await cobrarHabitacion(habitacion.reserva_activa.id_reserva, metodoPago)
      await onActualizado()
    } catch {
      setError('No se pudo cobrar y hacer check-out. Verifica que tengas una caja abierta.')
    } finally {
      setCobrando(false)
    }
  }

  const manejarCancelar = async (idReserva: number) => {
    try {
      await cancelarReserva(idReserva)
      await cargarProximas()
      await onActualizado()
    } catch {
      setError('No se pudo cancelar la reserva.')
    }
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-serif text-lg font-semibold text-card-foreground">Habitacion {habitacion.numero}</h3>
        <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
          Cerrar
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {habitacion.estado === 'OCUPADA' && habitacion.reserva_activa && (
        <div className="space-y-2 text-sm">
          <p className="font-medium text-foreground">
            {habitacion.reserva_activa.huesped.nombre}
          </p>
          <p className="text-muted-foreground">
            CC {habitacion.reserva_activa.huesped.cedula} · {habitacion.reserva_activa.huesped.contacto}
          </p>
          {habitacion.reserva_activa.huesped.placa && (
            <p className="text-muted-foreground">Placa {habitacion.reserva_activa.huesped.placa}</p>
          )}
          <p className="text-muted-foreground">
            Desde {habitacion.reserva_activa.fecha_checkin_prevista} hasta{' '}
            {habitacion.reserva_activa.fecha_checkout_prevista}
          </p>
          {puedeEditarReservas && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={metodoPago}
                onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                {METODOS.map((metodo) => (
                  <option key={metodo} value={metodo}>
                    {ETIQUETA_METODO[metodo]}
                  </option>
                ))}
              </select>
              <button
                onClick={manejarCheckOut}
                disabled={cobrando}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Cobrar y hacer check-out
              </button>
            </div>
          )}
          <ConsumoPanel
            idReserva={habitacion.reserva_activa.id_reserva}
            precioHospedaje={habitacion.reserva_activa.precio_total}
          />
        </div>
      )}

      {habitacion.estado !== 'OCUPADA' && (
        <div className="space-y-3 text-sm">
          <div className="flex flex-wrap gap-2">
            {(habitacion.estado === 'LIMPIEZA' || habitacion.estado === 'MANTENIMIENTO') &&
              puedeEditarHabitaciones && (
                <button
                  onClick={() => onCambiarEstado('DISPONIBLE')}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
                >
                  Marcar disponible
                </button>
              )}
            {habitacion.estado === 'DISPONIBLE' && puedeEditarHabitaciones && (
              <button
                onClick={() => onCambiarEstado('MANTENIMIENTO')}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary"
              >
                Poner en mantenimiento
              </button>
            )}
            {habitacion.estado === 'DISPONIBLE' && puedeCrearReservas && (
              <button
                onClick={onNuevaReserva}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
              >
                Nueva reserva
              </button>
            )}
          </div>

          <div>
            <h4 className="mb-1 text-xs font-medium text-muted-foreground">Proximas reservas</h4>
            {cargandoProximas && <p className="text-xs text-muted-foreground">Cargando...</p>}
            {!cargandoProximas && proximas.length === 0 && (
              <p className="text-xs text-muted-foreground">Sin reservas pendientes.</p>
            )}
            <ul className="space-y-2">
              {proximas.map((reserva) => (
                <li key={reserva.id_reserva} className="rounded-md border border-border p-2">
                  <p className="font-medium text-foreground">{reserva.huesped.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {reserva.fecha_checkin_prevista} - {reserva.fecha_checkout_prevista} ·{' '}
                    {formatoMoneda.format(reserva.precio_total)}
                  </p>
                  {puedeEditarReservas && (
                    <div className="mt-1 flex gap-2">
                      <button
                        onClick={() => manejarCheckIn(reserva.id_reserva)}
                        className="rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
                      >
                        Check-in
                      </button>
                      <button
                        onClick={() => manejarCancelar(reserva.id_reserva)}
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
