import { Pencil } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { listarHabitaciones } from './api'
import { HabitacionFormModal } from './HabitacionFormModal'
import type { Habitacion } from './types'

export function HabitacionesCatalogoPage() {
  const { tienePermiso } = useAuth()
  const [habitaciones, setHabitaciones] = useState<Habitacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Habitacion | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)

  const puedeCrear = tienePermiso('HABITACIONES', 'CREAR')
  const puedeEditar = tienePermiso('HABITACIONES', 'EDITAR_CATALOGO')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarHabitaciones()
      setHabitaciones(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar las habitaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const tiposExistentes = useMemo(
    () => Array.from(new Set(habitaciones.map((h) => h.tipo))).sort(),
    [habitaciones],
  )

  const abrirNueva = () => {
    setEditando(null)
    setMostrarForm(true)
  }

  const abrirEditar = (habitacion: Habitacion) => {
    setEditando(habitacion)
    setMostrarForm(true)
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando habitaciones...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Habitaciones
          </h1>
          <p className="text-sm text-muted-foreground">
            Numero, piso y tipo de cada habitacion. El estado operativo (disponible,
            ocupada...) se maneja desde Habitaciones en Operacion.
          </p>
        </div>
        {puedeCrear && (
          <button
            onClick={abrirNueva}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nueva habitacion
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Numero</th>
              <th className="px-3 py-2">Piso</th>
              <th className="px-3 py-2">Tipo</th>
              {puedeEditar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {habitaciones.map((habitacion) => (
              <tr key={habitacion.id_habitacion} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{habitacion.numero}</td>
                <td className="px-3 py-2 text-muted-foreground">{habitacion.piso}</td>
                <td className="px-3 py-2 text-muted-foreground">{habitacion.tipo}</td>
                {puedeEditar && (
                  <td className="px-3 py-2 text-right">
                    <IconActionButton icono={Pencil} etiqueta="Editar" onClick={() => abrirEditar(habitacion)} />
                  </td>
                )}
              </tr>
            ))}
            {habitaciones.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  No hay habitaciones creadas todavia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <HabitacionFormModal
          habitacionExistente={editando}
          tiposExistentes={tiposExistentes}
          onCerrar={() => setMostrarForm(false)}
          onGuardada={() => {
            setMostrarForm(false)
            recargar()
          }}
        />
      )}
    </div>
  )
}
