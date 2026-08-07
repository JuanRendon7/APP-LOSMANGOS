import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/shared/auth/AuthContext'
import { listarProductosRestaurante } from './api'
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

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando productos...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-secondary text-left text-xs uppercase text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Precio</th>
              <th className="px-3 py-2">Activo</th>
              {puedeGestionar && <th className="px-3 py-2" />}
            </tr>
          </thead>
          <tbody>
            {productos.map((producto) => (
              <tr key={producto.id_producto} className="border-t border-border">
                <td className="px-3 py-2 text-foreground">{producto.nombre}</td>
                <td className="px-3 py-2 text-foreground">
                  {formatoMoneda.format(producto.precio_venta)}
                </td>
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
                      className="text-xs font-medium text-foreground hover:underline"
                    >
                      Editar
                    </button>
                  </td>
                )}
              </tr>
            ))}
            {productos.length === 0 && (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                  No hay productos creados todavia.
                </td>
              </tr>
            )}
          </tbody>
        </table>
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
