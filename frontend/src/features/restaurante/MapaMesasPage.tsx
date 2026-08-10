import {
  Bell,
  ChefHat,
  CircleCheck,
  NotebookPen,
  Receipt,
  type LucideIcon,
} from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { actualizarMesa, listarMesas } from './api'
import { MesaFormModal } from './MesaFormModal'
import { PedidoPanel } from './PedidoPanel'
import type { EstadoPedido, Mesa } from './types'

type EstadoVisual = 'LIBRE' | 'TOMANDO_PEDIDO' | 'EN_COCINA' | 'LISTO' | 'SERVIDO'

interface VisualConfig {
  label: string
  icon: LucideIcon
  anillo: string
  badge: string
}

const CONFIG_VISUAL: Record<EstadoVisual, VisualConfig> = {
  LIBRE: { label: 'Libre', icon: CircleCheck, ...ESTILO_TONO.exito },
  TOMANDO_PEDIDO: { label: 'Tomando pedido', icon: NotebookPen, ...ESTILO_TONO.neutral },
  EN_COCINA: { label: 'En cocina', icon: ChefHat, ...ESTILO_TONO.info },
  LISTO: { label: 'Listo para servir', icon: Bell, ...ESTILO_TONO.alerta },
  SERVIDO: { label: 'Servido · por cobrar', icon: Receipt, ...ESTILO_TONO.exito },
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

const TAMANO_MESA = 128
const RADIO_TABLERO = 46
const RADIO_SILLAS = 68
const TAMANO_SILLA = 22

function posicionesSillas(cantidad: number): { x: number; y: number }[] {
  return Array.from({ length: cantidad }, (_, i) => {
    const angulo = (2 * Math.PI * i) / cantidad - Math.PI / 2
    return { x: Math.cos(angulo) * RADIO_SILLAS, y: Math.sin(angulo) * RADIO_SILLAS }
  })
}

function MesaIlustrada({
  mesa,
  cfg,
  seleccionada,
  modoEdicion,
}: {
  mesa: Mesa
  cfg: VisualConfig
  seleccionada: boolean
  modoEdicion: boolean
}) {
  const Icono = cfg.icon
  const listo = estadoVisual(mesa) === 'LISTO'
  const sillas = posicionesSillas(Math.min(Math.max(mesa.capacidad, 2), 8))

  return (
    <div
      className="relative"
      style={{ width: TAMANO_MESA, height: TAMANO_MESA }}
    >
      {sillas.map((silla, indice) => (
        <div
          key={indice}
          className="absolute rounded-md border border-marca-400 bg-marca-300 shadow-sm"
          style={{
            width: TAMANO_SILLA,
            height: TAMANO_SILLA,
            left: TAMANO_MESA / 2 + silla.x - TAMANO_SILLA / 2,
            top: TAMANO_MESA / 2 + silla.y - TAMANO_SILLA / 2,
          }}
        />
      ))}

      <div
        className={`absolute rounded-full border-2 shadow-lg transition-shadow ${
          listo ? 'animate-pulse' : ''
        } ${seleccionada ? 'ring-4 ring-ring ring-offset-2 ring-offset-background' : ''}`}
        style={{
          width: RADIO_TABLERO * 2,
          height: RADIO_TABLERO * 2,
          left: TAMANO_MESA / 2 - RADIO_TABLERO,
          top: TAMANO_MESA / 2 - RADIO_TABLERO,
          borderColor: cfg.anillo,
          background:
            'radial-gradient(circle at 32% 28%, var(--color-marca-100), var(--color-marca-300) 55%, var(--color-marca-500) 100%)',
        }}
      >
        <div className="flex h-full w-full flex-col items-center justify-center px-2 text-center">
          <span className="font-serif text-sm font-semibold leading-tight text-marca-900">
            {mesa.nombre}
          </span>
          <span className="text-[10px] leading-tight text-marca-700">{mesa.capacidad} pax</span>
          {mesa.pedido_activo && (
            <span className="mt-0.5 text-[9px] font-medium leading-tight text-marca-800">
              {formatoMoneda.format(mesa.pedido_activo.total)}
              <br />
              {minutosDesde(mesa.pedido_activo.creado_en)}m
            </span>
          )}
        </div>
      </div>

      <div
        className={`absolute flex items-center justify-center rounded-full border-2 border-background shadow ${cfg.badge}`}
        style={{
          width: 26,
          height: 26,
          left: TAMANO_MESA / 2 + RADIO_TABLERO - 10,
          top: TAMANO_MESA / 2 - RADIO_TABLERO - 10,
        }}
        title={cfg.label}
      >
        <Icono size={13} />
      </div>

      {modoEdicion && (
        <div className="pointer-events-none absolute inset-0 rounded-full border-2 border-dashed border-oro-500/60" />
      )}
    </div>
  )
}

export function MapaMesasPage() {
  const { tienePermiso } = useAuth()
  const [searchParams] = useSearchParams()
  const [mesas, setMesas] = useState<Mesa[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [idSeleccionada, setIdSeleccionada] = useState<number | null>(() => {
    const id = searchParams.get('id')
    return id ? Number(id) : null
  })
  const [modoEdicion, setModoEdicion] = useState(false)
  const [mostrarFormMesa, setMostrarFormMesa] = useState(false)
  const [editandoMesa, setEditandoMesa] = useState<Mesa | null>(null)
  const [guardando, setGuardando] = useState(false)

  const canvasRef = useRef<HTMLDivElement>(null)
  const arrastrandoRef = useRef<number | null>(null)
  const seMovioRef = useRef(false)
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

  // La busqueda global navega con ?id=; si ya estabamos en esta pagina, React
  // Router no remonta el componente (mismo path), asi que el useState inicial
  // no se entera de un ?id= que cambia despues sin este efecto.
  useEffect(() => {
    const id = searchParams.get('id')
    if (id) setIdSeleccionada(Number(id))
  }, [searchParams])

  const seleccionada = mesas.find((m) => m.id_mesa === idSeleccionada) ?? null

  // El panel de pedido aparece arriba de todo -- si la mesa se selecciono
  // desde el mapa (mas abajo en la pagina), sube el scroll para que se note.
  useEffect(() => {
    if (idSeleccionada !== null) {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [idSeleccionada])

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
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Mesas</h1>
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
                onClick={() => {
                  setEditandoMesa(null)
                  setMostrarFormMesa(true)
                }}
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
          Arrastra una mesa para moverla (y luego "Guardar posiciones"), o toca una mesa
          sin arrastrarla para editar su nombre y capacidad.
        </p>
      )}

      {seleccionada && !modoEdicion && (
        <PedidoPanel
          mesa={seleccionada}
          onCerrar={() => setIdSeleccionada(null)}
          onActualizado={recargar}
        />
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
        <div className="rounded-lg border border-alerta-300 bg-alerta-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-alerta-800">
            <Bell size={14} /> Listas para servir
          </div>
          <ul className="flex flex-wrap gap-2">
            {listasParaServir.map((mesa) => (
              <li key={mesa.id_mesa}>
                <button
                  onClick={() => setIdSeleccionada(mesa.id_mesa)}
                  className="rounded-md border border-alerta-300 bg-white px-2.5 py-1 text-sm font-medium text-alerta-900 hover:bg-alerta-100"
                >
                  {mesa.nombre}
                  {mesa.pedido_activo && (
                    <span className="ml-1 font-normal text-alerta-700">
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
        className="relative h-[560px] w-full touch-none overflow-hidden rounded-2xl border border-border shadow-inner"
        style={{
          background:
            'radial-gradient(ellipse at center, var(--color-marca-50), var(--color-marca-100) 100%)',
        }}
      >
        {mesas.map((mesa) => {
          const visual = estadoVisual(mesa)
          const cfg = CONFIG_VISUAL[visual]
          return (
            <button
              key={mesa.id_mesa}
              type="button"
              style={{
                left: `${mesa.pos_x}%`,
                top: `${mesa.pos_y}%`,
                width: TAMANO_MESA,
                height: TAMANO_MESA,
              }}
              className={`absolute -translate-x-1/2 -translate-y-1/2 transition-transform ${
                modoEdicion
                  ? 'cursor-grab active:cursor-grabbing active:scale-105'
                  : 'cursor-pointer hover:scale-105'
              }`}
              onPointerDown={(e) => {
                if (!modoEdicion) return
                e.currentTarget.setPointerCapture(e.pointerId)
                arrastrandoRef.current = mesa.id_mesa
                seMovioRef.current = false
              }}
              onPointerMove={(e) => {
                if (arrastrandoRef.current !== mesa.id_mesa) return
                seMovioRef.current = true
                moverMesa(mesa.id_mesa, e.clientX, e.clientY)
              }}
              onPointerUp={() => {
                arrastrandoRef.current = null
              }}
              onClick={() => {
                if (modoEdicion) {
                  if (seMovioRef.current) return
                  setEditandoMesa(mesa)
                  setMostrarFormMesa(true)
                  return
                }
                setIdSeleccionada(mesa.id_mesa)
              }}
            >
              <MesaIlustrada
                mesa={mesa}
                cfg={cfg}
                seleccionada={idSeleccionada === mesa.id_mesa}
                modoEdicion={modoEdicion}
              />
            </button>
          )
        })}
        {mesas.length === 0 && (
          <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">
            No hay mesas creadas todavia.
          </p>
        )}
      </div>

      {mostrarFormMesa && (
        <MesaFormModal
          mesaExistente={editandoMesa}
          onCerrar={() => setMostrarFormMesa(false)}
          onGuardada={() => {
            setMostrarFormMesa(false)
            // guardarPosiciones tambien recarga, y primero persiste cualquier
            // arrastre pendiente -- si solo llamaramos a recargar() aqui, esas
            // posiciones sin guardar se perderian (todas las mesas "saltan" a
            // su ultima posicion guardada, que por defecto es el centro).
            guardarPosiciones()
          }}
        />
      )}
    </div>
  )
}
