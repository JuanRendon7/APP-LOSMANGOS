import { useCallback, useEffect, useState } from 'react'
import { cobrarHabitacion } from '@/features/caja/api'
import { SelectorCaja } from '@/features/caja/SelectorCaja'
import type { MetodoPago } from '@/features/caja/types'
import { useTurnoCobro } from '@/features/caja/useTurnoCobro'
import { ConsumoPanel } from '@/features/consumo/ConsumoPanel'
import { useAuth } from '@/shared/auth/AuthContext'
import { DevueltaEfectivo } from '@/shared/ui/DevueltaEfectivo'
import { cambiarHabitacion, cancelarReserva, checkIn, checkOut, listarReservas } from './api'
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
  habitacionesDisponibles: Habitacion[]
  refreshToken: number
  onCerrar: () => void
  onCambiarEstado: (estado: string) => void
  onNuevaReserva: () => void
  onActualizado: () => Promise<void> | void
}

export function ReservaDetailPanel({
  habitacion,
  habitacionesDisponibles,
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
  const [idVentaParaImprimir, setIdVentaParaImprimir] = useState<number | null>(null)
  const [totalPendienteOcupada, setTotalPendienteOcupada] = useState(0)
  const [habitacionDestino, setHabitacionDestino] = useState('')
  const [idReservaConsumo, setIdReservaConsumo] = useState<number | null>(null)
  const { turnos, idTurno, setIdTurno } = useTurnoCobro()

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

  const manejarCobrar = async (idReserva: number) => {
    setError(null)
    setCobrando(true)
    try {
      const venta = await cobrarHabitacion(idReserva, metodoPago, idTurno ?? undefined)
      setIdVentaParaImprimir(venta.id_venta)
      await cargarProximas()
      await onActualizado()
    } catch {
      setError('No se pudo cobrar. Verifica que tengas una caja abierta y que no este todo ya cobrado.')
    } finally {
      setCobrando(false)
    }
  }

  const manejarCheckOut = async () => {
    if (!habitacion.reserva_activa) return
    setError(null)
    setCobrando(true)
    try {
      await checkOut(habitacion.reserva_activa.id_reserva)
      await onActualizado()
    } catch {
      setError('No se pudo hacer check-out.')
    } finally {
      setCobrando(false)
    }
  }

  const manejarCambiarHabitacion = async () => {
    if (!habitacion.reserva_activa || !habitacionDestino) return
    setError(null)
    setCobrando(true)
    try {
      await cambiarHabitacion(habitacion.reserva_activa.id_reserva, Number(habitacionDestino))
      setHabitacionDestino('')
      await onActualizado()
    } catch {
      setError('No se pudo cambiar de habitacion.')
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

  const hayProximas = cargandoProximas || proximas.length > 0

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-serif text-base font-semibold text-card-foreground">
          Habitacion {habitacion.numero}
        </h3>
        <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
          Cerrar
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      {idVentaParaImprimir && (
        <p className="mb-2 flex items-center gap-2 rounded-md bg-primary/10 px-2 py-1 text-sm text-primary">
          Cobro registrado.
          <button
            onClick={() => window.open(`/ventas/${idVentaParaImprimir}/recibo`, '_blank')}
            className="text-xs font-medium underline hover:opacity-80"
          >
            Imprimir recibo
          </button>
        </p>
      )}

      {habitacion.estado === 'OCUPADA' && habitacion.reserva_activa && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="font-medium text-foreground">
              {habitacion.reserva_activa.huesped.nombre}
            </span>
            <span className="text-muted-foreground">
              CC {habitacion.reserva_activa.huesped.cedula}
            </span>
            <span className="text-muted-foreground">
              {habitacion.reserva_activa.huesped.contacto}
            </span>
            {habitacion.reserva_activa.huesped.placa && (
              <span className="text-muted-foreground">
                Placa {habitacion.reserva_activa.huesped.placa}
              </span>
            )}
            <span className="text-muted-foreground">
              {habitacion.reserva_activa.fecha_checkin_prevista} →{' '}
              {habitacion.reserva_activa.fecha_checkout_prevista}
            </span>
            {habitacion.reserva_activa.pagada ? (
              <span className="inline-flex items-center rounded-full bg-exito-100 px-2 py-0.5 text-[11px] font-medium text-exito-800">
                Habitacion pagada
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-alerta-100 px-2 py-0.5 text-[11px] font-medium text-alerta-800">
                Habitacion sin cobrar
              </span>
            )}
          </div>
          {puedeEditarReservas && (
            <div className="flex flex-wrap items-center gap-2">
              <SelectorCaja
                turnos={turnos}
                idTurno={idTurno}
                onChange={setIdTurno}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
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
              {metodoPago === 'EFECTIVO' && <DevueltaEfectivo total={totalPendienteOcupada} />}
              <button
                onClick={() => manejarCobrar(habitacion.reserva_activa!.id_reserva)}
                disabled={cobrando}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
              >
                Cobrar
              </button>
              <button
                onClick={manejarCheckOut}
                disabled={cobrando}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                Hacer check-out
              </button>
            </div>
          )}
          {puedeEditarReservas && habitacionesDisponibles.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={habitacionDestino}
                onChange={(e) => setHabitacionDestino(e.target.value)}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Cambiar a otra habitacion...</option>
                {habitacionesDisponibles.map((h) => (
                  <option key={h.id_habitacion} value={h.id_habitacion}>
                    {h.numero} · {h.tipo}
                  </option>
                ))}
              </select>
              <button
                onClick={manejarCambiarHabitacion}
                disabled={cobrando || !habitacionDestino}
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-secondary disabled:opacity-50"
              >
                Cambiar de habitacion
              </button>
            </div>
          )}
          <ConsumoPanel
            idReserva={habitacion.reserva_activa.id_reserva}
            precioHospedaje={habitacion.reserva_activa.precio_total}
            hospedajePagado={habitacion.reserva_activa.pagada}
            onTotalPendienteCambio={setTotalPendienteOcupada}
          />
        </div>
      )}

      {habitacion.estado !== 'OCUPADA' && (
        <div className="space-y-2 text-sm">
          <div className="flex flex-wrap items-center gap-2">
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
            {!hayProximas && (
              <span className="text-xs text-muted-foreground">Sin reservas pendientes.</span>
            )}
          </div>

          {hayProximas && puedeEditarReservas && (
            <div className="flex flex-wrap items-center gap-2">
              <SelectorCaja
                turnos={turnos}
                idTurno={idTurno}
                onChange={setIdTurno}
                className="rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
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
            </div>
          )}

          {hayProximas && (
            <ul className="space-y-1.5">
              {cargandoProximas && <li className="text-xs text-muted-foreground">Cargando...</li>}
              {proximas.map((reserva) => (
                <li
                  key={reserva.id_reserva}
                  className="rounded-md border border-border px-2 py-1.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="truncate text-xs">
                    <span className="font-medium text-foreground">{reserva.huesped.nombre}</span>
                    <span className="text-muted-foreground">
                      {' '}
                      · {reserva.fecha_checkin_prevista} - {reserva.fecha_checkout_prevista} ·{' '}
                      {formatoMoneda.format(reserva.precio_total)}
                    </span>
                    {reserva.pagada && (
                      <span className="ml-1.5 inline-flex items-center rounded-full bg-exito-100 px-1.5 py-0.5 text-[10px] font-medium text-exito-800">
                        Pagada
                      </span>
                    )}
                  </span>
                  {puedeEditarReservas && (
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {!reserva.pagada && metodoPago === 'EFECTIVO' && (
                        <DevueltaEfectivo total={reserva.precio_total} />
                      )}
                      {!reserva.pagada && (
                        <button
                          onClick={() => manejarCobrar(reserva.id_reserva)}
                          disabled={cobrando}
                          className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary disabled:opacity-50"
                        >
                          Cobrar
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setIdReservaConsumo((actual) =>
                            actual === reserva.id_reserva ? null : reserva.id_reserva,
                          )
                        }
                        className="rounded-md border border-border px-2 py-1 text-xs font-medium hover:bg-secondary"
                      >
                        {idReservaConsumo === reserva.id_reserva ? 'Ocultar consumo' : 'Consumo'}
                      </button>
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
                  </div>
                  {puedeEditarReservas && idReservaConsumo === reserva.id_reserva && (
                    <ConsumoPanel
                      idReserva={reserva.id_reserva}
                      precioHospedaje={reserva.precio_total}
                      hospedajePagado={reserva.pagada}
                    />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
