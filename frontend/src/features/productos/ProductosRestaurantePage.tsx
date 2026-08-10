import { Ban, CircleCheck, CircleSlash, Coins, Pencil, Search, UtensilsCrossed } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { useAuth } from '@/shared/auth/AuthContext'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { IconActionButton } from '@/shared/ui/IconActionButton'
import { actualizarProductoRestaurante, listarProductosRestaurante } from './api'
import { ProductoRestauranteFormModal } from './ProductoRestauranteFormModal'
import {
  CATEGORIAS_PRODUCTO_RESTAURANTE,
  ETIQUETA_CATEGORIA_RESTAURANTE,
  type CategoriaProductoRestaurante,
  type ProductoRestaurante,
} from './types'

type FiltroCategoria = CategoriaProductoRestaurante | 'TODAS'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function ProductosRestaurantePage() {
  const { tienePermiso } = useAuth()
  const [searchParams] = useSearchParams()
  const [productos, setProductos] = useState<ProductoRestaurante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editando, setEditando] = useState<ProductoRestaurante | null>(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [busqueda, setBusqueda] = useState(() => searchParams.get('q') ?? '')
  const [soloActivos, setSoloActivos] = useState(false)
  const [categoriaFiltro, setCategoriaFiltro] = useState<FiltroCategoria>('TODAS')

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
      .filter((p) => categoriaFiltro === 'TODAS' || p.categoria === categoriaFiltro)
      .filter((p) => !texto || p.nombre.toLowerCase().includes(texto))
      .sort((a, b) => a.nombre.localeCompare(b.nombre))
  }, [productos, busqueda, soloActivos, categoriaFiltro])

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando productos...</p>
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground">Productos · Restaurante</h1>
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
              ? ESTILO_TONO.exito.chipActivo
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

      <div className="flex flex-wrap gap-2">
        {(['TODAS', ...CATEGORIAS_PRODUCTO_RESTAURANTE] as FiltroCategoria[]).map((categoria) => (
          <button
            key={categoria}
            onClick={() => setCategoriaFiltro(categoria)}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              categoriaFiltro === categoria
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border text-muted-foreground hover:bg-secondary'
            }`}
          >
            {categoria === 'TODAS' ? 'Todas' : ETIQUETA_CATEGORIA_RESTAURANTE[categoria]}
          </button>
        ))}
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

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-mango-700 text-left text-xs uppercase text-mango-50">
            <tr>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Categoria</th>
              <th className="px-3 py-2">Precio venta</th>
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
                      <UtensilsCrossed size={14} />
                    </div>
                    <span className={producto.activo ? '' : 'text-muted-foreground'}>
                      {producto.nombre}
                    </span>
                  </div>
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {ETIQUETA_CATEGORIA_RESTAURANTE[producto.categoria]}
                </td>
                <td className="px-3 py-2 text-foreground">
                  {formatoMoneda.format(producto.precio_venta)}
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
                  colSpan={puedeGestionar ? 5 : 4}
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
