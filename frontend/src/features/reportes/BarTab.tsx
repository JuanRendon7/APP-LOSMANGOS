import { Beer, Coins, Package, TriangleAlert } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { listarVentas } from '@/features/caja/api'
import type { MetodoPago, Venta } from '@/features/caja/types'
import { listarProductosBar } from '@/features/productos/api'
import type { ProductoBar } from '@/features/productos/types'
import { descargarExcel } from '@/shared/lib/excel'
import { Chip, formatoMoneda, StatCard } from './shared'

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

type Detalle = 'ventas' | 'inventario' | null

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
  const [detalle, setDetalle] = useState<Detalle>(null)

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

  const { itemsBar, ingreso, unidades, topProductos, ventasDetalle } = useMemo(() => {
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

    const porVenta = new Map<number, { venta: Venta; monto: number; productos: string[] }>()
    for (const item of items) {
      const actual = porVenta.get(item.venta.id_venta) ?? {
        venta: item.venta,
        monto: 0,
        productos: [],
      }
      actual.monto += item.cantidad * item.precio_unitario
      actual.productos.push(`${item.cantidad}× ${item.nombre_producto}`)
      porVenta.set(item.venta.id_venta, actual)
    }
    const detalleVentas = Array.from(porVenta.values()).sort(
      (a, b) => new Date(b.venta.creado_en).getTime() - new Date(a.venta.creado_en).getTime(),
    )

    return {
      itemsBar: items,
      ingreso: ingresoTotal,
      unidades: unidadesTotal,
      topProductos: top,
      ventasDetalle: detalleVentas,
    }
  }, [ventas])

  const stockBajo = productos.filter((p) => p.activo && p.stock <= p.umbral_stock_bajo)
  const valorInventario = productos.reduce((suma, p) => suma + p.stock * (p.precio_costo ?? 0), 0)
  const inventarioOrdenado = useMemo(
    () =>
      [...productos].sort((a, b) => {
        const bajoA = a.activo && a.stock <= a.umbral_stock_bajo
        const bajoB = b.activo && b.stock <= b.umbral_stock_bajo
        if (bajoA !== bajoB) return bajoA ? -1 : 1
        return a.nombre.localeCompare(b.nombre)
      }),
    [productos],
  )

  const descargar = async () => {
    if (itemsBar.length === 0) {
      setError('No hay ventas de bar en ese rango.')
      return
    }
    const filas = itemsBar.map((i) => [
      i.venta.creado_en,
      i.nombre_producto,
      i.cantidad,
      i.precio_unitario,
      i.cantidad * i.precio_unitario,
      ETIQUETA_METODO[i.venta.metodo_pago],
    ])
    await descargarExcel({
      nombreArchivo: `ventas_bar${desde && hasta ? `_${desde}_a_${hasta}` : ''}.xlsx`,
      hoja: 'Ventas de bar',
      titulo: 'Hotel Los Mangos · Ventas de bar',
      subtitulo: `Rango: ${desde || 'inicio'} a ${hasta || 'hoy'} · Metodo de pago: ${
        metodoPago === 'TODOS' ? 'Todos' : ETIQUETA_METODO[metodoPago]
      }`,
      columnas: [
        { titulo: 'Fecha', formato: 'fechahora' },
        { titulo: 'Producto', ancho: 26 },
        { titulo: 'Cantidad', formato: 'entero', totalizar: true },
        { titulo: 'Precio unitario', formato: 'moneda' },
        { titulo: 'Total', formato: 'moneda', totalizar: true },
        { titulo: 'Metodo de pago', ancho: 16 },
      ],
      filas,
    })
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
          activo={detalle === 'ventas'}
          onClick={() => setDetalle(detalle === 'ventas' ? null : 'ventas')}
        />
        <StatCard
          icon={Beer}
          label="Unidades vendidas"
          valor={unidades}
          sub="En el rango"
          activo={detalle === 'ventas'}
          onClick={() => setDetalle(detalle === 'ventas' ? null : 'ventas')}
        />
        <StatCard
          icon={TriangleAlert}
          label="Stock bajo"
          valor={stockBajo.length}
          sub="Productos activos por debajo del umbral"
          activo={detalle === 'inventario'}
          onClick={() => setDetalle(detalle === 'inventario' ? null : 'inventario')}
        />
        <StatCard
          icon={Package}
          label="Valor de inventario"
          valor={formatoMoneda.format(valorInventario)}
          sub="Stock actual x costo"
          activo={detalle === 'inventario'}
          onClick={() => setDetalle(detalle === 'inventario' ? null : 'inventario')}
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

      {detalle === 'ventas' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
            Ventas de bar · {ventasDetalle.length} en el rango
          </h2>
          {ventasDetalle.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin ventas en este filtro.</p>
          ) : (
            <ul className="max-h-96 space-y-1.5 overflow-y-auto text-sm">
              {ventasDetalle.map(({ venta, monto, productos: nombres }) => (
                <li
                  key={venta.id_venta}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {venta.origen === 'MESA'
                        ? (venta.nombre_mesa ?? 'Mesa')
                        : venta.origen === 'MOSTRADOR'
                          ? 'Mostrador'
                          : venta.origen}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {formatoHora.format(new Date(venta.creado_en))} ·{' '}
                        {ETIQUETA_METODO[venta.metodo_pago]}
                      </span>
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {nombres.join(', ')}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold text-foreground">
                    {formatoMoneda.format(monto)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {detalle === 'inventario' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
            Inventario de bar · {productos.length} productos
          </h2>
          {inventarioOrdenado.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay productos registrados.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
              {inventarioOrdenado.map((p) => {
                const bajo = p.activo && p.stock <= p.umbral_stock_bajo
                return (
                  <li
                    key={p.id_producto}
                    className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 odd:bg-muted/40"
                  >
                    <span className="truncate text-foreground">
                      {p.nombre}
                      {!p.activo && (
                        <span className="ml-2 text-xs text-muted-foreground">(inactivo)</span>
                      )}
                      {bajo && (
                        <span className="ml-2 text-xs font-medium text-alerta-700">
                          stock bajo
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 text-right text-foreground">
                      <span className="font-medium">{p.stock} und.</span>
                      <span className="ml-2 text-xs text-muted-foreground">
                        {formatoMoneda.format(p.stock * (p.precio_costo ?? 0))}
                      </span>
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
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
          Descargar Excel
        </button>
      </div>
    </div>
  )
}
