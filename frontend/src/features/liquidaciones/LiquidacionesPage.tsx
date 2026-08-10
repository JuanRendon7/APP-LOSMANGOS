import { Coins, Pencil, Trash2, Users } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { ConfirmDialog } from '@/shared/ui/ConfirmDialog'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { eliminarLiquidacion, listarLiquidaciones } from './api'
import { LiquidacionFormModal } from './LiquidacionFormModal'
import type { Liquidacion } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function LiquidacionesPage() {
  const [liquidaciones, setLiquidaciones] = useState<Liquidacion[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<Liquidacion | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [borrando, setBorrando] = useState<Liquidacion | null>(null)
  const [eliminando, setEliminando] = useState(false)
  const [filtroPeriodo, setFiltroPeriodo] = useState('')
  const [filtroNombre, setFiltroNombre] = useState('')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarLiquidaciones({
        periodo: filtroPeriodo || undefined,
        nombreEmpleado: filtroNombre || undefined,
      })
      setLiquidaciones(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar las liquidaciones.')
    } finally {
      setCargando(false)
    }
  }, [filtroPeriodo, filtroNombre])

  useEffect(() => {
    recargar()
  }, [recargar])

  const total = useMemo(
    () => liquidaciones.reduce((suma, l) => suma + l.monto, 0),
    [liquidaciones],
  )

  const confirmarEliminar = async () => {
    if (!borrando) return
    setEliminando(true)
    try {
      await eliminarLiquidacion(borrando.id_liquidacion)
      setBorrando(null)
      await recargar()
    } catch {
      setError('No se pudo eliminar la liquidacion.')
    } finally {
      setEliminando(false)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando liquidaciones...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">
            Liquidacion de empleados
          </h1>
          <p className="text-sm text-muted-foreground">
            Registro de lo que le pagas a tu equipo.
          </p>
        </div>
        <button
          onClick={() => {
            setEditando(null)
            setMostrarForm(true)
          }}
          className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          Nueva liquidacion
        </button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor="filtro-periodo" className="mb-1 block text-xs font-medium text-muted-foreground">
            Periodo
          </label>
          <input
            id="filtro-periodo"
            type="text"
            placeholder="Buscar por periodo..."
            value={filtroPeriodo}
            onChange={(e) => setFiltroPeriodo(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div>
          <label htmlFor="filtro-empleado" className="mb-1 block text-xs font-medium text-muted-foreground">
            Empleado
          </label>
          <input
            id="filtro-empleado"
            type="text"
            placeholder="Buscar por nombre..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        {(filtroPeriodo || filtroNombre) && (
          <button
            onClick={() => {
              setFiltroPeriodo('')
              setFiltroNombre('')
            }}
            className="rounded-md border border-border px-3 py-2 text-xs font-medium hover:bg-secondary"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Users size={14} /> {liquidaciones.length} pagos
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Coins size={14} /> Total {formatoMoneda.format(total)}
        </span>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Empleado</th>
              <th className="px-3 py-2">Periodo</th>
              <th className="px-3 py-2">Concepto</th>
              <th className="px-3 py-2">Fecha de pago</th>
              <th className="px-3 py-2">Monto</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {liquidaciones.map((liquidacion) => (
              <tr key={liquidacion.id_liquidacion} className="border-t border-border hover:bg-secondary/40">
                <td className="px-3 py-2 text-foreground">{liquidacion.nombre_empleado}</td>
                <td className="px-3 py-2 text-muted-foreground">{liquidacion.periodo}</td>
                <td className="px-3 py-2 text-muted-foreground">{liquidacion.concepto ?? '—'}</td>
                <td className="px-3 py-2 text-muted-foreground">{liquidacion.fecha_pago}</td>
                <td className="px-3 py-2 text-foreground">{formatoMoneda.format(liquidacion.monto)}</td>
                <td className="px-3 py-2 text-right">
                  <div className="flex justify-end gap-1">
                    <IconActionButton
                      icono={Pencil}
                      etiqueta="Editar"
                      onClick={() => {
                        setEditando(liquidacion)
                        setMostrarForm(true)
                      }}
                    />
                    <IconActionButton
                      icono={Trash2}
                      etiqueta="Eliminar"
                      tono="peligro"
                      onClick={() => setBorrando(liquidacion)}
                    />
                  </div>
                </td>
              </tr>
            ))}
            {liquidaciones.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-muted-foreground">
                  No hay liquidaciones registradas para este filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <LiquidacionFormModal
          liquidacionExistente={editando}
          onCerrar={() => setMostrarForm(false)}
          onGuardada={() => {
            setMostrarForm(false)
            recargar()
          }}
        />
      )}

      {borrando && (
        <ConfirmDialog
          titulo="Eliminar liquidacion"
          descripcion={`¿Eliminar el pago de ${formatoMoneda.format(borrando.monto)} a ${borrando.nombre_empleado}? Esta accion no se puede deshacer.`}
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
