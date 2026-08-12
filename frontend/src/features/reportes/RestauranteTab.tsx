import { Coins, Receipt, TrendingUp, UtensilsCrossed } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { listarVentas } from '@/features/caja/api'
import type { MetodoPago, OrigenVenta, Venta } from '@/features/caja/types'
import { listarProductosRestaurante } from '@/features/productos/api'
import type { ProductoRestaurante } from '@/features/productos/types'
import { descargarExcel } from '@/shared/lib/excel'
import { Chip, formatoMoneda, StatCard } from './shared'

const METODOS: MetodoPago[] = ['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'QR']
const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}

const ETIQUETA_ORIGEN_VENTA: Record<string, string> = {
  MESA: 'Mesa',
  MOSTRADOR: 'Mostrador',
}

const formatoHora = new Intl.DateTimeFormat('es-CO', {
  day: '2-digit',
  month: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Bogota',
})

type Detalle = 'ventas' | 'productos' | null

interface Props {
  desde: string
  hasta: string
}

export function RestauranteTab({ desde, hasta }: Props) {
  const [ventas, setVentas] = useState<Venta[]>([])
  const [productos, setProductos] = useState<ProductoRestaurante[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [metodoPago, setMetodoPago] = useState<MetodoPago | 'TODOS'>('TODOS')
  const [origen, setOrigen] = useState<Extract<OrigenVenta, 'MESA' | 'MOSTRADOR'> | 'TODOS'>('TODOS')
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
            origen: origen === 'TODOS' ? undefined : origen,
          }),
          listarProductosRestaurante(),
        ])
        if (cancelado) return
        setVentas(ventasDatos)
        setProductos(productosDatos)
        setError(null)
      } catch {
        if (!cancelado) setError('No se pudo cargar el resumen de restaurante.')
      } finally {
        if (!cancelado) setCargando(false)
      }
    }
    cargar()
    return () => {
      cancelado = true
    }
  }, [desde, hasta, metodoPago, origen])

  const productosActivos = useMemo(() => productos.filter((p) => p.activo), [productos])

  const { itemsRestaurante, ingreso, numeroPedidos, ticketPromedio, topPlatos, ventasDetalle } =
    useMemo(() => {
      const items = ventas.flatMap((v) =>
        v.items
          .filter((i) => i.id_producto_restaurante !== null)
          .map((i) => ({ ...i, venta: v })),
      )
      const ingresoTotal = items.reduce((suma, i) => suma + i.cantidad * i.precio_unitario, 0)
      const porProducto = new Map<string, { cantidad: number; ingreso: number }>()
      for (const item of items) {
        const actual = porProducto.get(item.nombre_producto) ?? { cantidad: 0, ingreso: 0 }
        actual.cantidad += item.cantidad
        actual.ingreso += item.cantidad * item.precio_unitario
        porProducto.set(item.nombre_producto, actual)
      }
      const top = Array.from(porProducto.entries())
        .map(([nombre, datos]) => ({ nombre, ...datos }))
        .sort((a, b) => b.ingreso - a.ingreso)
        .slice(0, 8)

      const porVenta = new Map<
        number,
        { venta: Venta; monto: number; productos: string[] }
      >()
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

      const pedidos = porVenta.size
      return {
        itemsRestaurante: items,
        ingreso: ingresoTotal,
        numeroPedidos: pedidos,
        ticketPromedio: pedidos > 0 ? Math.round(ingresoTotal / pedidos) : 0,
        topPlatos: top,
        ventasDetalle: detalleVentas,
      }
    }, [ventas])

  const descargar = async () => {
    if (itemsRestaurante.length === 0) {
      setError('No hay ventas de restaurante en ese rango.')
      return
    }
    const filas = itemsRestaurante.map((i) => [
      i.venta.creado_en,
      ETIQUETA_ORIGEN_VENTA[i.venta.origen] ?? i.venta.origen,
      i.venta.nombre_mesa ?? '',
      i.nombre_producto,
      i.cantidad,
      i.precio_unitario,
      i.cantidad * i.precio_unitario,
      ETIQUETA_METODO[i.venta.metodo_pago],
    ])
    await descargarExcel({
      nombreArchivo: `ventas_restaurante${desde && hasta ? `_${desde}_a_${hasta}` : ''}.xlsx`,
      hoja: 'Ventas de restaurante',
      titulo: 'Hotel Los Mangos · Ventas de restaurante',
      subtitulo: `Rango: ${desde || 'inicio'} a ${hasta || 'hoy'} · Origen: ${
        origen === 'TODOS' ? 'Todos' : ETIQUETA_ORIGEN_VENTA[origen]
      } · Metodo de pago: ${metodoPago === 'TODOS' ? 'Todos' : ETIQUETA_METODO[metodoPago]}`,
      columnas: [
        { titulo: 'Fecha', formato: 'fechahora' },
        { titulo: 'Origen', ancho: 14 },
        { titulo: 'Mesa', ancho: 14 },
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
    return <p className="text-sm text-muted-foreground">Cargando resumen de restaurante...</p>
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
          icon={Receipt}
          label="Pedidos cobrados"
          valor={numeroPedidos}
          sub="Mesa + mostrador"
          activo={detalle === 'ventas'}
          onClick={() => setDetalle(detalle === 'ventas' ? null : 'ventas')}
        />
        <StatCard
          icon={TrendingUp}
          label="Ticket promedio"
          valor={formatoMoneda.format(ticketPromedio)}
          sub="Por pedido cobrado"
          activo={detalle === 'ventas'}
          onClick={() => setDetalle(detalle === 'ventas' ? null : 'ventas')}
        />
        <StatCard
          icon={UtensilsCrossed}
          label="Productos activos"
          valor={productosActivos.length}
          sub="En el menu"
          activo={detalle === 'productos'}
          onClick={() => setDetalle(detalle === 'productos' ? null : 'productos')}
        />
      </div>

      {detalle === 'ventas' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
            Pedidos cobrados · {ventasDetalle.length} en el rango
          </h2>
          {ventasDetalle.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin pedidos cobrados en este filtro.</p>
          ) : (
            <ul className="max-h-96 space-y-1.5 overflow-y-auto text-sm">
              {ventasDetalle.map(({ venta, monto, productos: nombres }) => (
                <li
                  key={venta.id_venta}
                  className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {venta.origen === 'MESA' ? (venta.nombre_mesa ?? 'Mesa') : 'Mostrador'}
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

      {detalle === 'productos' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h2 className="mb-3 font-serif text-base font-semibold text-foreground">
            Productos activos · {productosActivos.length} en el menu
          </h2>
          {productosActivos.length === 0 ? (
            <p className="text-sm text-muted-foreground">No hay productos activos.</p>
          ) : (
            <ul className="max-h-96 space-y-1 overflow-y-auto text-sm">
              {productosActivos.map((p) => (
                <li
                  key={p.id_producto}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 odd:bg-muted/40"
                >
                  <span className="truncate text-foreground">{p.nombre}</span>
                  <span className="shrink-0 font-medium text-foreground">
                    {formatoMoneda.format(p.precio_venta)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3">
        <div>
          <p className="mb-1.5 text-xs font-medium text-muted-foreground">Origen</p>
          <div className="flex flex-wrap gap-1.5">
            <Chip activo={origen === 'TODOS'} onClick={() => setOrigen('TODOS')}>
              Todos
            </Chip>
            <Chip activo={origen === 'MESA'} onClick={() => setOrigen('MESA')}>
              Mesa
            </Chip>
            <Chip activo={origen === 'MOSTRADOR'} onClick={() => setOrigen('MOSTRADOR')}>
              Mostrador
            </Chip>
          </div>
        </div>
        <div>
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
      </div>

      <div className="rounded-xl border border-border bg-card p-4">
        <h2 className="mb-3 font-serif text-base font-semibold text-foreground">Platos mas vendidos</h2>
        {topPlatos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin ventas en este filtro.</p>
        ) : (
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topPlatos} layout="vertical" margin={{ left: 24, right: 32 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }} />
                <YAxis
                  type="category"
                  dataKey="nombre"
                  width={140}
                  tick={{ fontSize: 11, fill: 'var(--color-muted-foreground)' }}
                />
                <Tooltip
                  formatter={(valor, nombre) => {
                    if (nombre === 'ingreso') {
                      return [formatoMoneda.format(Number(valor)), 'Ingresos']
                    }
                    return [valor, nombre]
                  }}
                  labelFormatter={(_, payload) => {
                    const cantidad = payload?.[0]?.payload?.cantidad
                    return cantidad !== undefined ? `${cantidad} unidades vendidas` : ''
                  }}
                  contentStyle={{
                    background: 'var(--color-card)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="ingreso" name="Ingresos" fill="var(--color-primary)" radius={[0, 6, 6, 0]}>
                  <LabelList
                    dataKey="cantidad"
                    position="right"
                    formatter={(valor) => `${valor} und.`}
                    style={{ fill: 'var(--color-muted-foreground)', fontSize: 11 }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <h2 className="font-serif text-base font-semibold text-foreground">Exportar ventas de restaurante</h2>
        <p className="text-xs text-muted-foreground">
          Incluye el filtro de fechas, origen y metodo de pago seleccionados arriba.
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
