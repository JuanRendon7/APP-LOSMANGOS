import { useEffect, useState } from 'react'
import { cobrarPedido } from '@/features/caja/api'
import type { MetodoPago } from '@/features/caja/types'
import { listarProductosRestaurante } from '@/features/productos/api'
import type { ProductoRestaurante } from '@/features/productos/types'
import { useAuth } from '@/shared/auth/AuthContext'
import {
  agregarItem,
  avanzarEstado,
  cerrarPedido,
  crearPedido,
  eliminarItem,
  enviarACocina,
} from './api'
import type { EstadoPedido, Mesa } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}

const ESTADO_LABELS: Record<EstadoPedido, string> = {
  ABIERTO: 'Abierto',
  ENVIADO_COCINA: 'Enviado a cocina',
  EN_PREPARACION: 'En preparación',
  LISTO: 'Listo',
  ENTREGADO: 'Entregado',
  CERRADO: 'Cerrado',
}

const SIGUIENTE_ESTADO: Partial<Record<EstadoPedido, EstadoPedido>> = {
  ENVIADO_COCINA: 'EN_PREPARACION',
  EN_PREPARACION: 'LISTO',
  LISTO: 'ENTREGADO',
}

interface Props {
  mesa: Mesa
  onCerrar: () => void
  onActualizado: () => Promise<void> | void
}

export function PedidoPanel({ mesa, onCerrar, onActualizado }: Props) {
  const { tienePermiso } = useAuth()
  const [productos, setProductos] = useState<ProductoRestaurante[]>([])
  const [idProducto, setIdProducto] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState(1)
  const [nota, setNota] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO')

  const puedeEditar = tienePermiso('PEDIDOS', 'EDITAR')
  const puedeCrear = tienePermiso('PEDIDOS', 'CREAR')
  const pedido = mesa.pedido_activo

  useEffect(() => {
    listarProductosRestaurante().then((datos) =>
      setProductos(datos.filter((p) => p.activo)),
    )
  }, [])

  const conManejoDeError = async (accion: () => Promise<unknown>) => {
    setError(null)
    setProcesando(true)
    try {
      await accion()
      await onActualizado()
    } catch {
      setError('No se pudo completar la accion.')
    } finally {
      setProcesando(false)
    }
  }

  const manejarNuevoPedido = () => conManejoDeError(() => crearPedido(mesa.id_mesa))

  const manejarAgregarItem = () => {
    if (!idProducto || !pedido) return
    return conManejoDeError(async () => {
      await agregarItem(pedido.id_pedido, {
        id_producto: idProducto,
        cantidad,
        nota: nota || undefined,
      })
      setIdProducto('')
      setCantidad(1)
      setNota('')
    })
  }

  if (!pedido) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">{mesa.nombre}</h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>
        <p className="mb-3 text-sm text-muted-foreground">Mesa libre.</p>
        {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
        {puedeCrear && (
          <button
            onClick={manejarNuevoPedido}
            disabled={procesando}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Nuevo pedido
          </button>
        )}
      </div>
    )
  }

  const siguiente = SIGUIENTE_ESTADO[pedido.estado]

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-card-foreground">{mesa.nombre}</h3>
          <p className="text-xs text-muted-foreground">{ESTADO_LABELS[pedido.estado]}</p>
        </div>
        <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
          Cerrar
        </button>
      </div>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      <ul className="mb-3 space-y-2">
        {pedido.items.map((item) => (
          <li
            key={item.id_item}
            className="flex items-start justify-between rounded-md border border-border p-2 text-sm"
          >
            <div>
              <p className="font-medium text-foreground">
                {item.cantidad} × {item.nombre_producto}
              </p>
              {item.nota && <p className="text-xs text-muted-foreground">{item.nota}</p>}
              <p className="text-xs text-muted-foreground">
                {formatoMoneda.format(item.cantidad * item.precio_unitario)}
              </p>
            </div>
            {puedeEditar && pedido.estado !== 'CERRADO' && (
              <button
                onClick={() =>
                  conManejoDeError(() => eliminarItem(pedido.id_pedido, item.id_item))
                }
                className="text-xs text-destructive hover:underline"
              >
                Quitar
              </button>
            )}
          </li>
        ))}
        {pedido.items.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin productos todavia.</li>
        )}
      </ul>

      <p className="mb-3 text-sm font-semibold text-foreground">
        Total: {formatoMoneda.format(pedido.total)}
      </p>

      {puedeEditar && pedido.estado !== 'CERRADO' && (
        <div className="mb-3 space-y-2 rounded-md border border-border p-2">
          <select
            value={idProducto}
            onChange={(e) => setIdProducto(e.target.value ? Number(e.target.value) : '')}
            className="w-full rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecciona un producto</option>
            {productos.map((producto) => (
              <option key={producto.id_producto} value={producto.id_producto}>
                {producto.nombre} · {formatoMoneda.format(producto.precio_venta)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value) || 1)}
              className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="text"
              placeholder="Nota (opcional)"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <button
            onClick={manejarAgregarItem}
            disabled={!idProducto || procesando}
            className="w-full rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Agregar producto
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {puedeEditar && pedido.estado === 'ABIERTO' && (
          <button
            onClick={() => conManejoDeError(() => enviarACocina(pedido.id_pedido))}
            disabled={procesando || pedido.items.length === 0}
            className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Enviar a cocina
          </button>
        )}
        {puedeEditar && siguiente && (
          <button
            onClick={() => conManejoDeError(() => avanzarEstado(pedido.id_pedido))}
            disabled={procesando}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Marcar {ESTADO_LABELS[siguiente].toLowerCase()}
          </button>
        )}
        {pedido.items.length > 0 && (
          <button
            onClick={() =>
              window.open(`/pedidos/${pedido.id_pedido}/comanda`, '_blank')
            }
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary"
          >
            Ver comanda
          </button>
        )}
        {puedeEditar && pedido.estado !== 'CERRADO' && pedido.items.length > 0 && (
          <>
            <select
              value={metodoPago}
              onChange={(e) => setMetodoPago(e.target.value as MetodoPago)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              {METODOS.map((metodo) => (
                <option key={metodo} value={metodo}>
                  {ETIQUETA_METODO[metodo]}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                conManejoDeError(() => cobrarPedido(pedido.id_pedido, metodoPago))
              }
              disabled={procesando}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-destructive hover:bg-secondary disabled:opacity-50"
            >
              Cobrar y cerrar mesa
            </button>
          </>
        )}
        {puedeEditar && pedido.estado !== 'CERRADO' && pedido.items.length === 0 && (
          <button
            onClick={() => conManejoDeError(() => cerrarPedido(pedido.id_pedido))}
            disabled={procesando}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium text-destructive hover:bg-secondary disabled:opacity-50"
          >
            Cancelar pedido (sin cobro)
          </button>
        )}
      </div>
    </div>
  )
}
