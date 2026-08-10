import { Ban, Beer, Boxes, CircleCheck, Coins, PackageX, Pencil, Search, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { AjustarStockModal } from './AjustarStockModal'
import { actualizarProductoBar, listarProductosBar } from './api'
import { ProductoBarFormModal } from './ProductoBarFormModal'
import type { ProductoBar } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

function estiloStock(stock: number, umbral: number): string {
  if (stock <= 0) return ESTILO_TONO.peligro.badge
  if (stock <= umbral) return ESTILO_TONO.alerta.badge
  return ESTILO_TONO.exito.badge
}

export function ProductosBarPage() {
  const { tienePermiso } = useAuth()
  const [searchParams] = useSearchParams()
  const [productos, setProductos] = useState<ProductoBar[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<ProductoBar | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ajustandoStock, setAjustandoStock] = useState<ProductoBar | null>(null)
  const [busqueda, setBusqueda] = useState(() => searchParams.get('q') ?? '')
  const [soloActivos, setSoloActivos] = useState(false)

  const puedeGestionar = tienePermiso('PRODUCTOS_BAR', 'CREAR')
  const veCostos = tienePermiso('PRODUCTOS_BAR', 'VER_COSTOS')

  const recargar = useCallback(async () => {
    try {
      const datos = await listarProductosBar()
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

  const manejarToggleActivo = async (producto: ProductoBar) => {
    setError(null)
    try {
      await actualizarProductoBar(producto.id_producto, { activo: !producto.activo })
      await recargar()
    } catch {
      setError('No se pudo cambiar el estado del producto.')
    }
  }

  const activos = productos.filter((p) => p.activo)
  const stockBajo = productos.filter((p) => p.activo && p.stock <= p.umbral_stock_bajo)
  const valorInventario = productos.reduce(
    (suma, p) => suma + p.stock * (p.precio_costo ?? 0),
    0,
  )

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase()
    return productos
      .filter((p) => !soloActivos || p.activo)
      .filter(
        (p) =>
          !texto ||
          p.nombre.toLowerCase().includes(texto) ||
          (p.codigo_barras?.toLowerCase().includes(texto) ?? false),
      )
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [productos, busqueda, soloActivos])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando productos...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Productos · Bar</h1>
          <p className="text-sm text-muted-foreground">
            Catalogo con codigo de barras{veCostos ? ', costo y margen.' : '.'}
          </p>
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
          <Beer size={14} /> Total · {productos.length}
        </span>
        <button
          onClick={() => setSoloActivos((valor) => !valor)}
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
            soloActivos
              ? ESTILO_TONO.exito.chipActivo
              : 'border-border text-muted-foreground hover:bg-secondary'
          }`}
        >
          <CircleCheck size={14} /> Activos · {activos.length}
        </button>
        <span
          className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium ${
            stockBajo.length > 0
              ? 'border-alerta-300 bg-alerta-50 text-alerta-800'
              : 'border-border text-muted-foreground'
          }`}
        >
          <TriangleAlert size={14} /> Stock bajo · {stockBajo.length}
        </span>
        {veCostos && (
          <span className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground">
            <Coins size={14} /> Valor inventario · {formatoMoneda.format(valorInventario)}
          </span>
        )}
      </div>

      {stockBajo.length > 0 && (
        <div className="rounded-lg border border-alerta-300 bg-alerta-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-alerta-800">
            <TriangleAlert size={14} /> Productos con stock bajo
          </div>
          <ul className="flex flex-wrap gap-2">
            {stockBajo.map((producto) => (
              <li key={producto.id_producto}>
                <button
                  onClick={() => setAjustandoStock(producto)}
                  className="flex items-center gap-1.5 rounded-md border border-alerta-300 bg-white px-2.5 py-1 text-sm font-medium text-alerta-900 hover:bg-alerta-100"
                >
                  {producto.stock <= 0 ? (
                    <PackageX size={14} className="text-peligro-600" />
                  ) : (
                    <TriangleAlert size={14} />
                  )}
                  {producto.nombre} · {producto.stock} und.
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="relative max-w-sm">
        <Search
          size={16}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="Buscar por nombre o codigo..."
          className="w-full rounded-md border border-input bg-background py-2 pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Codigo</th>
              <th className="px-3 py-2">Precio venta</th>
              {veCostos && <th className="px-3 py-2">Costo</th>}
              {veCostos && <th className="px-3 py-2">Margen</th>}
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Estado</th>
              {puedeGestionar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {visibles.map((producto) => (
              <tr key={producto.id_producto} className="border-t border-border hover:bg-secondary/40">
                <td className="px-3 py-2 text-foreground">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-primary">
                      <Beer size={14} />
                    </div>
                    <span className={producto.activo ? '' : 'text-muted-foreground'}>
                      {producto.nombre}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                  {producto.codigo_barras ?? '—'}
                </td>
                <td className="px-3 py-2 text-foreground">
                  {formatoMoneda.format(producto.precio_venta)}
                </td>
                {veCostos && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {producto.precio_costo !== null
                      ? formatoMoneda.format(producto.precio_costo)
                      : '—'}
                  </td>
                )}
                {veCostos && (
                  <td className="px-3 py-2 text-muted-foreground">
                    {producto.margen !== null
                      ? `${formatoMoneda.format(producto.margen)} (${producto.margen_porcentaje}%)`
                      : '—'}
                  </td>
                )}
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${estiloStock(producto.stock, producto.umbral_stock_bajo)}`}
                  >
                    {producto.stock} und.
                  </span>
                </td>
                <td className="px-3 py-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${
                      producto.activo
                        ? ESTILO_TONO.exito.badge
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {producto.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right">
                    <div className="flex justify-end gap-1">
                      <IconActionButton
                        icono={Pencil}
                        etiqueta="Editar"
                        onClick={() => {
                          setEditando(producto)
                          setMostrarForm(true)
                        }}
                      />
                      <IconActionButton
                        icono={Boxes}
                        etiqueta="Ajustar stock"
                        onClick={() => setAjustandoStock(producto)}
                      />
                      <IconActionButton
                        icono={producto.activo ? Ban : CircleCheck}
                        etiqueta={producto.activo ? 'Desactivar' : 'Activar'}
                        tono={producto.activo ? 'peligro' : 'exito'}
                        onClick={() => manejarToggleActivo(producto)}
                      />
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {visibles.length === 0 && (
              <tr>
                <td
                  colSpan={5 + (veCostos ? 2 : 0) + (puedeGestionar ? 1 : 0)}
                  className="px-3 py-6 text-center text-muted-foreground"
                >
                  {productos.length === 0
                    ? 'No hay productos creados todavia.'
                    : 'Ningun producto coincide con la busqueda.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {mostrarForm && (
        <ProductoBarFormModal
          productoExistente={editando}
          onCerrar={() => setMostrarForm(false)}
          onGuardado={() => {
            setMostrarForm(false)
            recargar()
          }}
        />
      )}

      {ajustandoStock && (
        <AjustarStockModal
          producto={ajustandoStock}
          onCerrar={() => setAjustandoStock(null)}
          onAjustado={() => {
            setAjustandoStock(null)
            recargar()
          }}
        />
      )}
    </div>
  )
}
