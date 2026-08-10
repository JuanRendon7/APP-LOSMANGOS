import { Bell, ChefHat, Clock, Printer } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { avanzarEstado, listarPedidos } from './api'
import type { EstadoPedido, Pedido } from './types'

const INTERVALO_SONDEO_MS = 15000

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  ABIERTO: 'Abierto',
  ENVIADO_COCINA: 'Nuevo',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  CERRADO: 'Cerrado',
}

const SIGUIENTE_ESTADO: Partial<Record<EstadoPedido, EstadoPedido>> = {
  ENVIADO_COCINA: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
}

const TEXTO_BOTON: Partial<Record<EstadoPedido, string>> = {
  ENVIADO_COCINA: 'Marcar en preparación',
  EN_PREPARACION: 'Marcar listo',
}

function minutosDesde(iso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 60000))
}

function TarjetaPedido({
  pedido,
  puedeEditar,
  procesando,
  onAvanzar,
}: {
  pedido: Pedido
  puedeEditar: boolean
  procesando: boolean
  onAvanzar: () => void
}) {
  const tono = pedido.estado === 'ENVIADO_COCINA' ? 'alerta' : 'info'
  const siguiente = SIGUIENTE_ESTADO[pedido.estado]

  return (
    <div className={`rounded-lg border bg-card p-4 ${ESTILO_TONO[tono].marco}`}>
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="font-serif text-lg font-semibold text-card-foreground">
          {pedido.nombre_mesa}
        </h3>
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${ESTILO_TONO[tono].badge}`}
        >
          {ESTADO_LABELS[pedido.estado]}
        </span>
      </div>

      {pedido.enviado_cocina_en && (
        <p className="mb-2 flex items-center gap-1 text-xs text-muted-foreground">
          <Clock size={12} /> Hace {minutosDesde(pedido.enviado_cocina_en)}m
        </p>
      )}

      <ul className="mb-3 space-y-1 text-sm">
        {pedido.items.map((item) => (
          <li key={item.id_item}>
            <span className="font-medium text-foreground">
              {item.cantidad}× {item.nombre_producto}
            </span>
            {item.nota && (
              <span className="ml-1.5 text-alerta-700">— {item.nota}</span>
            )}
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap gap-2">
        {puedeEditar && siguiente && (
          <button
            onClick={onAvanzar}
            disabled={procesando}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {procesando ? 'Guardando...' : TEXTO_BOTON[pedido.estado]}
          </button>
        )}
        <button
          onClick={() => window.open(`/pedidos/${pedido.id_pedido}/comanda`, '_blank')}
          className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
        >
          <Printer size={14} /> Ver comanda
        </button>
      </div>
    </div>
  )
}

export function CocinaPage() {
  const { tienePermiso } = useAuth()
  const [pendientes, setPendientes] = useState<Pedido[]>([])
  const [listos, setListos] = useState<Pedido[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState<number | null>(null)

  const puedeEditar = tienePermiso('PEDIDOS', 'EDITAR')

  const cargar = useCallback(async () => {
    try {
      const [enviados, enPreparacion, listosDatos] = await Promise.all([
        listarPedidos({ estado: 'ENVIADO_COCINA' }),
        listarPedidos({ estado: 'EN_PREPARACION' }),
        listarPedidos({ estado: 'LISTO' }),
      ])
      const activos = [...enviados, ...enPreparacion].sort((a, b) =>
        (a.enviado_cocina_en ?? '').localeCompare(b.enviado_cocina_en ?? ''),
      )
      setPendientes(activos)
      setListos(listosDatos)
      setError(null)
    } catch {
      setError('No se pudieron cargar los pedidos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    cargar()
    const id = setInterval(cargar, INTERVALO_SONDEO_MS)
    return () => clearInterval(id)
  }, [cargar])

  const avanzar = async (pedido: Pedido) => {
    setProcesando(pedido.id_pedido)
    setError(null)
    try {
      await avanzarEstado(pedido.id_pedido)
      await cargar()
    } catch {
      setError('No se pudo actualizar el pedido.')
    } finally {
      setProcesando(null)
    }
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando pedidos...</p>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 font-serif text-2xl font-semibold tracking-tight text-foreground">
          <ChefHat size={24} className="text-primary" /> Cocina
        </h1>
        <p className="text-sm text-muted-foreground">
          {pendientes.length} pedido{pendientes.length === 1 ? '' : 's'} por preparar
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {pendientes.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          No hay pedidos pendientes en este momento.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pendientes.map((pedido) => (
            <TarjetaPedido
              key={pedido.id_pedido}
              pedido={pedido}
              puedeEditar={puedeEditar}
              procesando={procesando === pedido.id_pedido}
              onAvanzar={() => avanzar(pedido)}
            />
          ))}
        </div>
      )}

      {listos.length > 0 && (
        <div>
          <h2 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Bell size={13} /> Listos · esperando que los recojan
          </h2>
          <div className="flex flex-wrap gap-2">
            {listos.map((pedido) => (
              <span
                key={pedido.id_pedido}
                className={`rounded-full px-3 py-1.5 text-sm font-medium ${ESTILO_TONO.exito.badge}`}
              >
                {pedido.nombre_mesa}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
