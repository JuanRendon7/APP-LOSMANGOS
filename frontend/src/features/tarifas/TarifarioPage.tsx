import { Pencil, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { eliminarTemporada, listarTemporadas } from './api'
import { TemporadaFormModal } from './TemporadaFormModal'
import type { Temporada } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function TarifarioPage() {
  const [temporadas, setTemporadas] = useState<Temporada[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Temporada | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [borrando, setBorrando] = useState<Temporada | null>(null)
  const [eliminando, setEliminando] = useState(false)

  const recargar = useCallback(async () => {
    try {
      const datos = await listarTemporadas()
      setTemporadas(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar las temporadas.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const abrirNueva = () => {
    setEditando(null)
    setMostrarForm(true)
  }

  const abrirEditar = (temporada: Temporada) => {
    setEditando(temporada)
    setMostrarForm(true)
  }

  const confirmarEliminar = async () => {
    if (!borrando) return
    setEliminando(true)
    try {
      await eliminarTemporada(borrando.id_temporada)
      setBorrando(null)
      await recargar()
    } catch {
      setError('No se pudo eliminar la temporada.')
    } finally {
      setEliminando(false)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando tarifario...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Tarifario</h1>
          <p className="text-sm text-muted-foreground">
            Precios por temporada. El total de cada reserva se calcula con estos valores.
          </p>
        </div>
        <button
          onClick={abrirNueva}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Nueva temporada
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Desde</th>
              <th className="px-3 py-2">Hasta</th>
              <th className="px-3 py-2">Precio/noche</th>
              <th className="px-3 py-2">Activa</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {temporadas.map((temporada) => (
              <tr key={temporada.id_temporada} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{temporada.nombre}</td>
                <td className="px-3 py-2 text-muted-foreground">{temporada.fecha_inicio}</td>
                <td className="px-3 py-2 text-muted-foreground">{temporada.fecha_fin}</td>
                <td className="px-3 py-2 text-foreground">
                  {formatoMoneda.format(temporada.precio_noche)}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {temporada.activa ? 'Si' : 'No'}
                </td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <IconActionButton icono={Pencil} etiqueta="Editar" onClick={() => abrirEditar(temporada)} />
                    <IconActionButton
                      icono={Trash2}
                      etiqueta="Eliminar"
                      tono="peligro"
                      onClick={() => setBorrando(temporada)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {temporadas.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay temporadas creadas todavia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <TemporadaFormModal
          temporadaExistente={editando}
          onCerrar={() => setMostrarForm(false)}
          onGuardada={() => {
            setMostrarForm(false)
            recargar()
          }}
        />
      )}

      {borrando && (
        <ConfirmDialog
          titulo="Eliminar temporada"
          descripcion={`¿Eliminar la temporada "${borrando.nombre}"? Esta accion no se puede deshacer.`}
          etiquetaConfirmar="Eliminar"
          tono="peligro"
          procesando={eliminando}
          onConfirmar={confirmarEliminar}
          onCancelar={() => setBorrando(null)}
        />
      )}
    </div>
  )
}
