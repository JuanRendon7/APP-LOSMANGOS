import {
  Bell,
  ChefHat,
  CircleCheck,
  NotebookPen,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { actualizarMesa, listarMesas } from './api'
import { MesaFormModal } from './MesaFormModal'
import { PedidoPanel } from './PedidoPanel'
import type { EstadoPedido, Mesa } from './types'

type EstadoVisual = 'LIBRE' | 'TOMANDO_PEDIDO' | 'EN_COCINA' | 'LISTO' | 'SERVIDO'

interface VisualConfig {
  label: string
  icon: LucideIcon
  marcador: string
  badge: string
}

const CONFIG_VISUAL: Record<EstadoVisual, VisualConfig> = {
  LIBRE: {
    label: 'Libre',
    icon: CircleCheck,
    marcador: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    badge: 'bg-emerald-100 text-emerald-800',
  },
  TOMANDO_PEDIDO: {
    label: 'Tomando pedido',
    icon: NotebookPen,
    marcador: 'border-slate-300 bg-slate-100 text-slate-800',
    badge: 'bg-slate-200 text-slate-800',
  },
  EN_COCINA: {
    label: 'En cocina',
    icon: ChefHat,
    marcador: 'border-blue-400 bg-blue-500 text-white',
    badge: 'bg-blue-100 text-blue-800',
  },
  LISTO: {
    label: 'Listo para servir',
    icon: Bell,
    marcador: 'border-amber-400 bg-amber-400 text-amber-950 animate-pulse',
    badge: 'bg-amber-100 text-amber-800',
  },
  SERVIDO: {
    label: 'Servido · por cobrar',
    icon: Receipt,
    marcador: 'border-primary bg-primary text-primary-foreground',
    badge: 'bg-orange-100 text-orange-800',
  },
}

const ORDEN_VISUAL: EstadoVisual[] = ['LIBRE', 'TOMANDO_PEDIDO', 'EN_COCINA', 'LISTO', 'SERVIDO']

const ESTADO_PEDIDO_A_VISUAL: Record<EstadoPedido, EstadoVisual> = {
  ABIERTO: 'TOMANDO_PEDIDO',
  ENVIADO_COCINA: 'EN_COCINA',
  EN_PREPARACION: 'EN_COCINA',
  LISTO: 'LISTO',
  ENTREGADO: 'SERVIDO',
  CERRADO: 'SERVIDO',
}

function estadoVisual(mesa: Mesa): EstadoVisual {
  if (mesa.estado === 'LIBRE' || !mesa.pedido_activo) return 'LIBRE'
  return ESTADO_PEDIDO_A_VISUAL[mesa.pedido_activo.estado]
}

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function minutosDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
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

  useEffect(() => {
    if (modoEdicion) return
    const id = setInterval(recargar, 20000)
    return () => clearInterval(id)
  }, [modoEdicion, recargar])

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

  const conteos = ORDEN_VISUAL.reduce(
    (acc, estado) => {
      acc[estado] = mesas.filter((m) => estadoVisual(m) === estado).length
      return acc
    },
    {} as Record<EstadoVisual, number>,
  )

  const listasParaServir = mesas.filter((m) => estadoVisual(m) === 'LISTO')

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando mesas...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Mesas</h1>
          <p className="text-sm text-muted-foreground">
            {mesas.length} mesas · {conteos.LIBRE} libres · {mesas.length - conteos.LIBRE} ocupadas
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

      {!modoEdicion && (
        <div className="flex flex-wrap gap-2">
          {ORDEN_VISUAL.map((estado) => {
            const cfg = CONFIG_VISUAL[estado]
            const Icono = cfg.icon
            return (
              <span
                key={estado}
                className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground"
              >
                <Icono size={14} />
                {cfg.label} · {conteos[estado]}
              </span>
            )
          })}
        </div>
      )}

      {!modoEdicion && listasParaServir.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-800">
            <Bell size={14} /> Listas para servir
          </div>
          <ul className="flex flex-wrap gap-2">
            {listasParaServir.map((mesa) => (
              <li key={mesa.id_mesa}>
                <button
                  onClick={() => setIdSeleccionada(mesa.id_mesa)}
                  className="rounded-md border border-amber-300 bg-white px-2.5 py-1 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  {mesa.nombre}
                  {mesa.pedido_activo && (
                    <span className="ml-1 font-normal text-amber-700">
                      · {minutosDesde(mesa.pedido_activo.creado_en)}m
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div
        ref={canvasRef}
        className="relative h-[420px] w-full touch-none rounded-xl border-2 border-dashed border-border bg-card/60"
      >
        {mesas.map((mesa) => {
          const visual = estadoVisual(mesa)
          const cfg = CONFIG_VISUAL[visual]
          return (
            <button
              key={mesa.id_mesa}
              type="button"
              style={{ left: `${mesa.pos_x}%`, top: `${mesa.pos_y}%` }}
              className={`absolute flex h-20 w-24 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center gap-0.5 rounded-xl border text-xs font-medium shadow-sm transition-all ${
                cfg.marcador
              } ${modoEdicion ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer hover:shadow-md'} ${
                idSeleccionada === mesa.id_mesa ? 'ring-2 ring-ring ring-offset-2 ring-offset-background' : ''
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
              <span className="opacity-80">{mesa.capacidad} pax</span>
              {mesa.pedido_activo && (
                <span className="opacity-90">
                  {formatoMoneda.format(mesa.pedido_activo.total)} · {minutosDesde(mesa.pedido_activo.creado_en)}m
                </span>
              )}
            </button>
          )
        })}
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
