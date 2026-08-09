import { Beer, Coins, Package, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listarVentas } from '@/features/caja/api'
import type { MetodoPago, Venta } from '@/features/caja/types'
import { listarProductosBar } from '@/features/productos/api'
import type { ProductoBar } from '@/features/productos/types'
import { descargarCsv } from '@/shared/lib/csv'
import { Chip, formatoMoneda, StatCard } from './shared'

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}
interface Props {
  desde: string
  hasta: string
}

export function BarTab({ desde, hasta }: Props) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<ProductoBar[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago | 'TODOS'>('TODOS')

  useEffect(() => {
    let cancelado = false
    async function cargar() {
      setCargando(true)
      try {
        const [ventasDatos, productosDatos] = await Promise.all([
          listarVentas({
            desde: desde || undefined,
            hasta: hasta || undefined,
            metodoPago: metodoPago === 'TODOS' ? undefined : metodoPago,
          }),
          listarProductosBar(),
        ])
        if (cancelado) return
        setVentas(ventasDatos)
        setProductos(productosDatos)
        setError(null)
      } catch {
        if (!cancelado) setError('No se pudo cargar el resumen de bar.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [desde, hasta, metodoPago])

  const { itemsBar, ingreso, unidades, topProductos } = useMemo(() => {
    const items = ventas.flatMap((v) =>
      v.items.filter((i) => i.id_producto_bar !== null).map((i) => ({ ...i, venta: v })),
    )
    const ingresoTotal = items.reduce((suma, i) => suma + i.cantidad * i.precio_unitario, 0)
    const unidadesTotal = items.reduce((suma, i) => suma + i.cantidad, 0)
    const porProducto = new Map<string, { cantidad: number; ingreso: number }>()
    for (const item of items) {
      const actual = porProducto.get(item.nombre_producto) ?? { cantidad: 0, ingreso: 0 }
      actual.cantidad += item.cantidad
      actual.ingreso += item.cantidad * item.precio_unitario
      porProducto.set(item.nombre_producto, actual)
    }
    const top = Array.from(porProducto.entries())
      .map(([nombre, datos]) => ({ nombre, ...datos }))
      .sort((a, b) => b.cantidad - a.cantidad)
      .slice(0, 8)
    return { itemsBar: items, ingreso: ingresoTotal, unidades: unidadesTotal, topProductos: top }
  }, [ventas])

  const stockBajo = productos.filter((p) => p.activo && p.stock <= p.umbral_stock_bajo)
  const valorInventario = productos.reduce((suma, p) => suma + p.stock * (p.precio_costo ?? 0), 0)

  const descargar = () => {
    if (itemsBar.length === 0) {
      setError('No hay ventas de bar en ese rango.')
      return
    }
    const encabezados = ['Fecha', 'Producto', 'Cantidad', 'Precio unitario', 'Total', 'Metodo de pago']
    const filas = itemsBar.map((i) => [
      i.venta.creado_en,
      i.nombre_producto,
      String(i.cantidad),
      String(i.precio_unitario),
      String(i.cantidad * i.precio_unitario),
      ETIQUETA_METODO[i.venta.metodo_pago],
    ])
    descargarCsv(`ventas_bar${desde && hasta ? `_${desde}_a_${hasta}` : ''}.csv`, encabezados, filas)
  }

  if (cargando) {
    return <p className="text-sm text-muted-foreground">Cargando resumen de bar...</p>
  }

  return (
    <div className="space-y-4">
      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          icon={Coins}
          label="Ingresos"
          valor={formatoMoneda.format(ingreso)}
          sub={desde || hasta ? 'En el rango seleccionado' : 'Historico completo'}
        />
        <StatCard icon={Beer} label="Unidades vendidas" valor={unidades} sub="En el rango" />
        <StatCard
          icon={TriangleAlert}
          label="Stock bajo"
          valor={stockBajo.length}
          sub="Productos activos por debajo del umbral"
        />
        <StatCard
          icon={Package}
          label="Valor de inventario"
          valor={formatoMoneda.format(valorInventario)}
          sub="Stock actual x costo"
        />
      </div>

      {stockBajo.length > 0 && (
        <div className="rounded-lg border border-alerta-300 bg-alerta-50 p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-alerta-800">
            <TriangleAlert size={14} /> Productos con stock bajo ahora
          </div>
          <ul className="flex flex-wrap gap-2">
            {stockBajo.map((p) => (
              <li
                key={p.id_producto}
                className="rounded-md border border-alerta-300 bg-white px-2.5 py-1 text-sm font-medium text-alerta-900"
              >
                {p.nombre} · {p.stock} und.
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-border bg-card p-3">
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Metodo de pago</p>
        <div className="flex flex-wrap gap-1.5">
          <Chip activo={metodoPago === 'TODOS'} onClick={() => setMetodoPago('TODOS')}>
            Todos
          </Chip>
          {METODOS.map((metodo) => (
            <Chip key={metodo} activo={metodoPago === metodo} onClick={() => setMetodoPago(metodo)}>
              {ETIQUETA_METODO[metodo]}
            </Chip>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-serif text-base font-semibold text-foreground">Productos mas vendidos (unidades)</h2>
        {topProductos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas en este filtro.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topProductos} layout="vertical" margin={{ left: 24 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={140}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                />
                <Tooltip
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="cantidad" name="Unidades" fill="var(--color-primary)" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-serif text-base font-semibold text-foreground">Exportar ventas de bar</h2>
        <p className="text-xs text-muted-foreground">
          Incluye el filtro de fechas y metodo de pago seleccionados arriba.
        </p>
        <button
          onClick={descargar}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Descargar Excel (CSV)
        </button>
      </div>
    </div>
  )
}
