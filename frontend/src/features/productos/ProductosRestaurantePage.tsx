import { CircleCheck, CircleSlash, Coins, Search, UtensilsCrossed } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { actualizarProductoRestaurante, listarProductosRestaurante } from './api'
import { ProductoRestauranteFormModal } from './ProductoRestauranteFormModal'
import type { ProductoRestaurante } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function ProductosRestaurantePage() {
  const { tienePermiso } = useAuth()
  const [productos, setProductos] = useState<ProductoRestaurante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<ProductoRestaurante | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [soloActivos, setSoloActivos] = useState(false)

  const puedeGestionar = tienePermiso('PRODUCTOS_RESTAURANTE', 'CREAR')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarProductosRestaurante()
      setProductos(datos)
      setError(null)
    } catch {
      setError('No se pudieron cargar los productos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  const manejarToggleActivo = async (producto: ProductoRestaurante) => {
    setError(null)
    try {
      await actualizarProductoRestaurante(producto.id_producto, { activo: !producto.activo })
      await recargar()
    } catch {
      setError('No se pudo cambiar el estado del producto.')
    }
  }

  const activos = productos.filter((p) => p.activo)
  const precioPromedio =
    productos.length > 0
      ? Math.round(productos.reduce((suma, p) => suma + p.precio_venta, 0) / productos.length)
      : 0

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => !soloActivos || p.activo)
      .filter((p) => !texto || p.nombre.toLowerCase().includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [productos, busqueda, soloActivos])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando productos...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Productos · Restaurante</h1>
          <p className="text-sm text-muted-foreground">Menu del restaurante.</p>
        </div>
        {puedeGestionar && (
          <button
            onClick={() => {
              setEditando(null)
              setMostrarForm(true)
            }}
            className="rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Nuevo producto
          </button>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <UtensilsCrossed size={14} /> Total · {productos.length}
        </span>
        <button
          onClick={() => setSoloActivos((valor) => !valor)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            soloActivos
              ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
              : 'border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          <CircleCheck size={14} /> Activos · {activos.length}
        </button>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <CircleSlash size={14} /> Inactivos · {productos.length - activos.length}
        </span>
        <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
          <Coins size={14} /> Precio promedio · {formatoMoneda.format(precioPromedio)}
        </span>
      </div>

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar producto..."
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {visibles.map((producto) => (
          <div
            key={producto.id_producto}
            className={`flex flex-col gap-2 rounded-xl border bg-card p-3 shadow-sm ${
              producto.activo ? 'border-border' : 'border-border opacity-60'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
                <UtensilsCrossed size={16} />
              </div>
              <span
                className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                  producto.activo
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {producto.activo ? 'Activo' : 'Inactivo'}
              </span>
            </div>
            <p className="truncate text-sm font-semibold text-card-foreground" title={producto.nombre}>
              {producto.nombre}
            </p>
            <p className="text-sm font-medium text-foreground">
              {formatoMoneda.format(producto.precio_venta)}
            </p>
            {puedeGestionar && (
              <div className="mt-1 flex gap-2 border-t border-border pt-2 text-xs font-medium">
                <button
                  onClick={() => {
                    setEditando(producto)
                    setMostrarForm(true)
                  }}
                  className="text-foreground hover:underline"
                >
                  Editar
                </button>
                <button
                  onClick={() => manejarToggleActivo(producto)}
                  className="text-muted-foreground hover:underline"
                >
                  {producto.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            )}
          </div>
        ))}
        {visibles.length === 0 && (
          <p className="col-span-full py-6 text-center text-sm text-muted-foreground">
            {productos.length === 0
              ? 'No hay productos creados todavia.'
              : 'Ningun producto coincide con la busqueda.'}
          </p>
        )}
      </div>

      {mostrarForm && (
        <ProductoRestauranteFormModal
          productoExistente={editando}
          onCerrar={() => setMostrarForm(false)}
          onGuardado={() => {
            setMostrarForm(false)
            recargar()
          }}
        />
      )}
    </div>
  )
}
