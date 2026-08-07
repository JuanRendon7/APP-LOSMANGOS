import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { AjustarStockModal } from './AjustarStockModal'
import { listarProductosBar } from './api'
import { ProductoBarFormModal } from './ProductoBarFormModal'
import type { ProductoBar } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function ProductosBarPage() {
  const { tienePermiso } = useAuth()
  const [productos, setProductos] = useState<ProductoBar[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<ProductoBar | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [ajustandoStock, setAjustandoStock] = useState<ProductoBar | null>(null)

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

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando productos...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Productos · Bar</h1>
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Codigo</th>
              <th className="px-3 py-2">Precio venta</th>
              {veCostos && <th className="px-3 py-2">Costo</th>}
              {veCostos && <th className="px-3 py-2">Margen</th>}
              <th className="px-3 py-2">Stock</th>
              <th className="px-3 py-2">Activo</th>
              {puedeGestionar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id_producto} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{producto.nombre}</td>
                <td className="px-3 py-2 text-muted-foreground">{producto.codigo_barras}</td>
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
                <td className="px-3 py-2 text-foreground">{producto.stock}</td>
                <td className="px-3 py-2 text-muted-foreground">
                  {producto.activo ? 'Si' : 'No'}
                </td>
                {puedeGestionar && (
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => {
                        setEditando(producto)
                        setMostrarForm(true)
                      }}
                      className="mr-3 text-xs font-medium text-foreground hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => setAjustandoStock(producto)}
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      Ajustar stock
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-6 text-center text-muted-foreground">
                  No hay productos creados todavia.
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
