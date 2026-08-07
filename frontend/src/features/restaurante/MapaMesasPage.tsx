import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { actualizarMesa, listarMesas } from './api'
import { MesaFormModal } from './MesaFormModal'
import { PedidoPanel } from './PedidoPanel'
import type { EstadoMesa, Mesa } from './types'

const ESTADO_ESTILOS: Record<EstadoMesa, string> = {
  LIBRE: 'border-emerald-300 bg-emerald-50 text-emerald-800',
  OCUPADA: 'border-primary bg-primary text-primary-foreground',
}

export function MapaMesasPage() {
  const { tienePermiso } = useAuth()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(null)
  const [modoEdicion, setModoEdicion] = useState(false)
  const [mostrarFormMesa, setMostrarFormMesa] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const arrastrandoRef = useRef<number | null>(null)
  const modificadasRef = useRef<Set<number>>(new Set())

  const puedeEditarMapa = tienePermiso('MESAS', 'EDITAR')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarMesas()
      setMesas(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar las mesas.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const seleccionada = mesas.find((m) => m.id_mesa === idSeleccionada) ?? null

  const moverMesa = (idMesa: number, clientX: number, clientY: number) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100))
    modificadasRef.current.add(idMesa)
    setMesas((actual) =>
      actual.map((m) => (m.id_mesa === idMesa ? { ...m, pos_x: x, pos_y: y } : m)),
    )
  }

  const guardarPosiciones = async () => {
    setGuardando(true)
    try {
      const ids = Array.from(modificadasRef.current)
      await Promise.all(
        ids.map((id) => {
          const mesa = mesas.find((m) => m.id_mesa === id)
          if (!mesa) return Promise.resolve()
          return actualizarMesa(id, { pos_x: mesa.pos_x, pos_y: mesa.pos_y })
        }),
      )
      modificadasRef.current.clear()
      await recargar()
    } catch {
      setError('No se pudieron guardar las posiciones.')
    } finally {
      setGuardando(false)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando mesas...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Mesas</h1>
          <p className="text-sm text-muted-foreground">
            Toca una mesa para ver o crear su pedido.
          </p>
        </div>
        {puedeEditarMapa && (
          <div className="flex gap-2">
            {modoEdicion && (
              <button
                type="button"
                onClick={guardarPosiciones}
                disabled={guardando}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary disabled:opacity-50"
              >
                {guardando ? 'Guardando...' : 'Guardar posiciones'}
              </button>
            )}
            {modoEdicion && (
              <button
                type="button"
                onClick={() => setMostrarFormMesa(true)}
                className="rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-secondary"
              >
                Agregar mesa
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                setModoEdicion((valor) => !valor)
                setIdSeleccionada(null)
              }}
              className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {modoEdicion ? 'Salir de edicion' : 'Editar mapa'}
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {modoEdicion && (
        <p className="text-xs text-muted-foreground">
          Arrastra las mesas a su posicion y luego "Guardar posiciones".
        </p>
      )}

      <div
        ref={canvasRef}
        className="relative h-[420px] w-full touch-none rounded-xl border-2 border-dashed border-border bg-card/60"
      >
        {mesas.map((mesa) => (
          <button
            key={mesa.id_mesa}
            type="button"
            style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%` }}
            className={`absolute flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-lg border text-xs font-medium ${
              ESTADO_ESTILOS[mesa.estado]
            } ${modoEdicion ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
              idSeleccionada === mesa.id_mesa ? 'ring-2 ring-ring' : ''
            }`}
            onPointerDown={(e) => {
              if (!modoEdicion) return
              e.currentTarget.setPointerCapture(e.pointerId)
              arrastrandoRef.current = mesa.id_mesa
            }}
            onPointerMove={(e) => {
              if (arrastrandoRef.current !== mesa.id_mesa) return
              moverMesa(mesa.id_mesa, e.clientX, e.clientY)
            }}
            onPointerUp={() => {
              arrastrandoRef.current = null
            }}
            onClick={() => {
              if (modoEdicion) return
              setIdSeleccionada(mesa.id_mesa)
            }}
          >
            <span className="font-semibold">{mesa.nombre}</span>
            <span>{mesa.capacidad} pax</span>
          </button>
        ))}
        {mesas.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No hay mesas creadas todavia.
          </p>
        )}
      </div>

      {seleccionada && !modoEdicion && (
        <PedidoPanel
          mesa={seleccionada}
          onCerrar={() => setIdSeleccionada(null)}
          onActualizado={recargar}
        />
      )}

      {mostrarFormMesa && (
        <MesaFormModal
          onCerrar={() => setMostrarFormMesa(false)}
          onCreada={() => {
            setMostrarFormMesa(false)
            recargar()
          }}
        />
      )}
    </div>
  )
}
