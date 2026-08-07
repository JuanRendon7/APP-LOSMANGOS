import { useCallback, useEffect, useState } from 'react'
import { listarProductosBar, listarProductosRestaurante } from '@/features/productos/api'
import type { ProductoBar, ProductoRestaurante } from '@/features/productos/types'
import { useAuth } from '@/shared/auth/AuthContext'
import { agregarConsumo, eliminarConsumo, listarConsumo } from './api'
import type { ConsumoResumen, OrigenConsumo } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const ETIQUETA_ORIGEN: Record<OrigenConsumo, string> = {
  BAR: 'Bar',
  RESTAURANTE: 'Restaurante',
}

interface Props {
  idReserva: number
  precioHospedaje: number
}

export function ConsumoPanel({ idReserva, precioHospedaje }: Props) {
  const { tienePermiso } = useAuth()
  const [resumen, setResumen] = useState<ConsumoResumen | null>(null)
  const [productosBar, setProductosBar] = useState<ProductoBar[]>([])
  const [productosRestaurante, setProductosRestaurante] = useState<ProductoRestaurante[]>(
    [],
  )
  const [origen, setOrigen] = useState<OrigenConsumo>('BAR')
  const [idProducto, setIdProducto] = useState<number | ''>('')
  const [cantidad, setCantidad] = useState(1)
  const [error, setError] = useState<string | null>(null)
  const [procesando, setProcesando] = useState(false)

  const puedeCrear = tienePermiso('VENTAS', 'CREAR')
  const puedeEditar = tienePermiso('VENTAS', 'EDITAR')

  const cargar = useCallback(async () => {
    try {
      const [datosConsumo, bar, restaurante] = await Promise.all([
        listarConsumo(idReserva),
        listarProductosBar(),
        listarProductosRestaurante(),
      ])
      setResumen(datosConsumo)
      setProductosBar(bar.filter((p) => p.activo))
      setProductosRestaurante(restaurante.filter((p) => p.activo))
    } catch {
      setError('No se pudo cargar el consumo.')
    }
  }, [idReserva])

  useEffect(() => {
    cargar()
  }, [cargar])

  const opciones = origen === 'BAR' ? productosBar : productosRestaurante

  const manejarAgregar = async () => {
    if (!idProducto) return
    setError(null)
    setProcesando(true)
    try {
      await agregarConsumo({
        id_reserva: idReserva,
        origen,
        id_producto: idProducto,
        cantidad,
      })
      setIdProducto('')
      setCantidad(1)
      await cargar()
    } catch {
      setError('No se pudo agregar el producto.')
    } finally {
      setProcesando(false)
    }
  }

  const manejarEliminar = async (idConsumo: number) => {
    setError(null)
    setProcesando(true)
    try {
      await eliminarConsumo(idConsumo)
      await cargar()
    } catch {
      setError('No se pudo quitar el producto.')
    } finally {
      setProcesando(false)
    }
  }

  if (!resumen) return null

  const totalGeneral = precioHospedaje + resumen.total

  return (
    <div className="mt-3 border-t border-border pt-3">
      <h4 className="mb-2 text-xs font-medium text-muted-foreground">
        Consumo (bar / restaurante)
      </h4>

      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      <ul className="mb-2 space-y-1">
        {resumen.items.map((item) => (
          <li
            key={item.id_consumo}
            className="flex items-center justify-between gap-2 text-sm"
          >
            <span>
              {item.cantidad} × {item.nombre_producto}{' '}
              <span className="text-xs text-muted-foreground">
                ({ETIQUETA_ORIGEN[item.origen]})
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-2">
              {formatoMoneda.format(item.cantidad * item.precio_unitario)}
              {puedeEditar && (
                <button
                  onClick={() => manejarEliminar(item.id_consumo)}
                  className="text-xs text-destructive hover:underline"
                >
                  Quitar
                </button>
              )}
            </span>
          </li>
        ))}
        {resumen.items.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin consumo todavia.</li>
        )}
      </ul>

      {puedeCrear && (
        <div className="mb-2 flex flex-wrap gap-2">
          <select
            value={origen}
            onChange={(e) => {
              setOrigen(e.target.value as OrigenConsumo)
              setIdProducto('')
            }}
            className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="BAR">Bar</option>
            <option value="RESTAURANTE">Restaurante</option>
          </select>
          <select
            value={idProducto}
            onChange={(e) => setIdProducto(e.target.value ? Number(e.target.value) : '')}
            className="min-w-[10rem] flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Selecciona un producto</option>
            {opciones.map((producto) => (
              <option key={producto.id_producto} value={producto.id_producto}>
                {producto.nombre} · {formatoMoneda.format(producto.precio_venta)}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={cantidad}
            onChange={(e) => setCantidad(Number(e.target.value) || 1)}
            className="w-16 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            onClick={manejarAgregar}
            disabled={!idProducto || procesando}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-secondary disabled:opacity-50"
          >
            Agregar
          </button>
        </div>
      )}

      <div className="text-sm">
        <p className="text-muted-foreground">
          Hospedaje: {formatoMoneda.format(precioHospedaje)}
        </p>
        <p className="text-muted-foreground">
          Consumo: {formatoMoneda.format(resumen.total)}
        </p>
        <p className="font-semibold text-foreground">
          Total: {formatoMoneda.format(totalGeneral)}
        </p>
      </div>
    </div>
  )
}
