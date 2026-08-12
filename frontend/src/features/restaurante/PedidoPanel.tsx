import { useEffect, useMemo, useState } from 'react'
import { cobrarPedido } from '@/features/caja/api'
import { SelectorCaja } from '@/features/caja/SelectorCaja'
import type { MetodoPago } from '@/features/caja/types'
import { useTurnoCobro } from '@/features/caja/useTurnoCobro'
import { listarProductosBar, listarProductosRestaurante } from '@/features/productos/api'
import type { ProductoBar, ProductoRestaurante } from '@/features/productos/types'
import { useAuth } from '@/shared/auth/AuthContext'
import { BuscadorProducto } from '@/shared/ui/BuscadorProducto'
import { DevueltaEfectivo } from '@/shared/ui/DevueltaEfectivo'
import {
  agregarItem,
  avanzarEstado,
  cerrarPedido,
  crearPedido,
  eliminarItem,
  enviarACocina,
  moverPedido,
} from './api'
import type { EstadoPedido, Mesa, OrigenPedidoItem } from './types'

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
  mesasLibres: Mesa[]
  onCerrar: () => void
  onActualizado: () => Promise<void> | void
}

export function PedidoPanel({ mesa, mesasLibres, onCerrar, onActualizado }: Props) {
  const { tienePermiso } = useAuth()
  const [productosRestaurante, setProductosRestaurante] = useState<ProductoRestaurante[]>([])
  const [productosBar, setProductosBar] = useState<ProductoBar[]>([])
  const [seleccion, setSeleccion] = useState('')
  const [cantidad, setCantidad] = useState(1)
  const [nota, setNota] = useState('')
  const [precioManual, setPrecioManual] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('EFECTIVO')
  const [mesaDestino, setMesaDestino] = useState('')
  const [idVentaParaImprimir, setIdVentaParaImprimir] = useState<number | null>(null)
  const { turnos, idTurno, setIdTurno } = useTurnoCobro()

  const puedeEditar = tienePermiso('PEDIDOS', 'EDITAR')
  const puedeCrear = tienePermiso('PEDIDOS', 'CREAR')
  const pedido = mesa.pedido_activo

  useEffect(() => {
    listarProductosRestaurante().then((datos) =>
      setProductosRestaurante(datos.filter((p) => p.activo)),
    )
    listarProductosBar().then((datos) => setProductosBar(datos.filter((p) => p.activo)))
  }, [])

  const opcionesProducto = useMemo(
    () => [
      ...productosRestaurante.map((producto) => ({ origen: 'RESTAURANTE' as const, producto })),
      ...productosBar.map((producto) => ({ origen: 'BAR' as const, producto })),
    ],
    [productosRestaurante, productosBar],
  )

  const productoSeleccionado = useMemo(() => {
    const [origen, idTexto] = seleccion.split(':')
    const id = Number(idTexto)
    if (origen === 'BAR') {
      return productosBar.find((p) => p.id_producto === id) ?? null
    }
    if (origen === 'RESTAURANTE') {
      return productosRestaurante.find((p) => p.id_producto === id) ?? null
    }
    return null
  }, [seleccion, productosBar, productosRestaurante])

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
    if (!productoSeleccionado || !pedido) return
    const [origen, idTexto] = seleccion.split(':')
    return conManejoDeError(async () => {
      await agregarItem(pedido.id_pedido, {
        origen: origen as OrigenPedidoItem,
        id_producto: Number(idTexto),
        cantidad,
        nota: nota || undefined,
        precio_unitario: precioManual ? Number(precioManual) : undefined,
      })
      setSeleccion('')
      setCantidad(1)
      setNota('')
      setPrecioManual('')
    })
  }

  if (!pedido) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-serif text-lg font-semibold text-card-foreground">{mesa.nombre}</h3>
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
          <h3 className="font-serif text-lg font-semibold text-card-foreground">{mesa.nombre}</h3>
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

      <p className="mb-3 flex flex-wrap items-center gap-3 font-serif text-xl font-semibold text-foreground">
        Total: {formatoMoneda.format(pedido.total)}
        {idVentaParaImprimir && (
          <button
            onClick={() => window.open(`/ventas/${idVentaParaImprimir}/recibo`, '_blank')}
            className="text-xs font-medium text-primary underline hover:opacity-80"
          >
            Imprimir recibo
          </button>
        )}
      </p>

      {puedeEditar && pedido.estado !== 'CERRADO' && (
        <div className="mb-3 space-y-2 rounded-md border border-border p-2">
          <BuscadorProducto
            opciones={opcionesProducto}
            claveSeleccionada={seleccion}
            obtenerClave={(o) => `${o.origen}:${o.producto.id_producto}`}
            obtenerEtiqueta={(o) => o.producto.nombre}
            obtenerDetalle={(o) =>
              `${formatoMoneda.format(o.producto.precio_venta)} · ${o.origen === 'BAR' ? 'Bar' : 'Restaurante'}`
            }
            onSeleccionar={(o) => {
              setSeleccion(`${o.origen}:${o.producto.id_producto}`)
              setPrecioManual('')
            }}
            placeholder="Busca o selecciona un producto (bar o restaurante)"
          />
          <div className="flex gap-2">
            <input
              type="number"
              min={1}
              value={cantidad}
              onChange={(e) => setCantidad(Number(e.target.value) || 1)}
              className="w-20 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
            <input
              type="number"
              min={0}
              step={1}
              placeholder={
                productoSeleccionado
                  ? `Precio: ${formatoMoneda.format(productoSeleccionado.precio_venta)}`
                  : 'Precio'
              }
              value={precioManual}
              onChange={(e) => setPrecioManual(e.target.value)}
              className="w-32 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
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
            disabled={!seleccion || procesando}
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
        {puedeEditar && pedido.estado !== 'CERRADO' && mesasLibres.length > 0 && (
          <>
            <select
              value={mesaDestino}
              onChange={(e) => setMesaDestino(e.target.value)}
              className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
            >
              <option value="">Mover a otra mesa...</option>
              {mesasLibres.map((m) => (
                <option key={m.id_mesa} value={m.id_mesa}>
                  {m.nombre}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                conManejoDeError(async () => {
                  await moverPedido(pedido.id_pedido, Number(mesaDestino))
                  setMesaDestino('')
                  onCerrar()
                })
              }
              disabled={procesando || !mesaDestino}
              className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
            >
              Mover pedido
            </button>
          </>
        )}
        {puedeEditar && pedido.estado !== 'CERRADO' && pedido.items.length > 0 && (
          <>
            <SelectorCaja turnos={turnos} idTurno={idTurno} onChange={setIdTurno} />
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
            {metodoPago === 'EFECTIVO' && <DevueltaEfectivo total={pedido.total} />}
            <button
              onClick={() =>
                conManejoDeError(async () => {
                  const venta = await cobrarPedido(
                    pedido.id_pedido,
                    metodoPago,
                    idTurno ?? undefined,
                  )
                  setIdVentaParaImprimir(venta.id_venta)
                })
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
