import { useCallback, useEffect, useState } from 'react'
import { actualizarEstadoHabitacion, listarHabitaciones } from './api'
import { ReservaDetailPanel } from './ReservaDetailPanel'
import { ReservaFormModal } from './ReservaFormModal'
import type { EstadoHabitacion, Habitacion } from './types'

const ESTADO_ESTILOS: Record<EstadoHabitacion, string> = {
  DISPONIBLE: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  OCUPADA: 'border-blue-300 bg-blue-50 text-blue-800',
  LIMPIEZA: 'border-amber-300 bg-amber-50 text-amber-800',
  MANTENIMIENTO: 'border-red-300 bg-red-50 text-red-800',
}

const ESTADO_LABELS: Record<EstadoHabitacion, string> = {
  DISPONIBLE: 'Disponible',
  OCUPADA: 'Ocupada',
  LIMPIEZA: 'Limpieza',
  MANTENIMIENTO: 'Mantenimiento',
}

export function HabitacionesPage() {
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(null)
  const [mostrarFormReserva, setMostrarFormReserva] = useState(false)
  const [refreshToken, setRefreshToken] = useState(0)

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

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando habitaciones...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Habitaciones</h1>
        <p className="text-sm text-muted-foreground">17 habitaciones en 2 pisos.</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {pisos.map((piso) => (
        <div key={piso} className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">Piso {piso}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {habitaciones
              .filter((h) => h.piso === piso)
              .map((habitacion) => (
                <button
                  key={habitacion.id_habitacion}
                  onClick={() => setIdSeleccionada(habitacion.id_habitacion)}
                  className={`rounded-lg border p-3 text-left transition-colors hover:opacity-90 ${
                    ESTADO_ESTILOS[habitacion.estado]
                  } ${idSeleccionada === habitacion.id_habitacion ? 'ring-2 ring-ring' : ''}`}
                >
                  <div className="text-lg font-semibold">{habitacion.numero}</div>
                  <div className="text-xs">{ESTADO_LABELS[habitacion.estado]}</div>
                  {habitacion.reserva_activa && (
                    <div className="mt-1 truncate text-xs opacity-80">
                      {habitacion.reserva_activa.huesped.nombre}
                    </div>
                  )}
                </button>
              ))}
          </div>
        </div>
      ))}

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
