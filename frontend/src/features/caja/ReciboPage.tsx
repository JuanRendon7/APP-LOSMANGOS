import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { NIT_NEGOCIO, NOMBRE_NEGOCIO } from '@/shared/lib/negocio'
import { formatoFechaLargaBogota, formatoHoraBogota } from '@/shared/lib/tiempo'
import { obtenerVenta } from './api'
import type { MetodoPago, OrigenVenta, Venta } from './types'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

const ETIQUETA_ORIGEN: Record<OrigenVenta, string> = {
  HABITACION: 'Habitacion',
  MESA: 'Mesa',
  MOSTRADOR: 'Mostrador',
}

const ETIQUETA_METODO: Record<MetodoPago, string> = {
  EFECTIVO: 'Efectivo',
  TARJETA: 'Tarjeta',
  TRANSFERENCIA: 'Transferencia',
  QR: 'QR',
}

function lugarVenta(venta: Venta): string | null {
  if (venta.origen === 'MESA' && venta.nombre_mesa) return venta.nombre_mesa
  if (venta.origen === 'HABITACION' && venta.numero_habitacion) {
    return `Habitacion ${venta.numero_habitacion}`
  }
  return null
}

export function ReciboPage() {
  const { id } = useParams<{ id: string }>()
  const [venta, setVenta] = useState<Venta | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    obtenerVenta(Number(id))
      .then((datos) => {
        setVenta(datos)
        setTimeout(() => window.print(), 300)
      })
      .catch(() => setError('No se pudo cargar la venta.'))
  }, [id])

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>
  }
  if (!venta) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando recibo...</p>
  }

  const fecha = new Date(venta.creado_en)
  const lugar = lugarVenta(venta)

  return (
    <div className="mx-auto max-w-sm bg-background p-6 font-mono text-sm text-foreground">
      <style>{'@media print { @page { margin: 8mm; } }'}</style>

      <div className="mb-4 border-b border-dashed border-border pb-3 text-center">
        <p className="text-base font-bold">{NOMBRE_NEGOCIO}</p>
        <p className="text-xs text-muted-foreground">NIT: {NIT_NEGOCIO}</p>
        <p className="text-xs text-muted-foreground">Recibo de venta</p>
      </div>

      <p>
        Fecha: {formatoFechaLargaBogota.format(fecha)} {formatoHoraBogota.format(fecha)}
      </p>
      <p>Venta #{venta.id_venta}</p>
      <p>
        {ETIQUETA_ORIGEN[venta.origen]}
        {lugar && ` · ${lugar}`}
      </p>

      <div className="my-3 border-t border-dashed border-border pt-3">
        {venta.items.map((item) => (
          <div key={item.id_venta_item} className="mb-1 flex justify-between gap-2">
            <span>
              {item.cantidad} × {item.nombre_producto}
            </span>
            <span className="shrink-0">
              {formatoMoneda.format(item.cantidad * item.precio_unitario)}
            </span>
          </div>
        ))}
        {venta.items.length === 0 && <p>Sin productos.</p>}
      </div>

      <div className="border-t border-dashed border-border pt-3">
        <p>Metodo de pago: {ETIQUETA_METODO[venta.metodo_pago]}</p>
        <p className="text-right font-semibold">Total: {formatoMoneda.format(venta.monto)}</p>
      </div>

      <div className="mt-3 border-t border-dashed border-border pt-3 text-center text-xs text-muted-foreground">
        <p>¡Gracias por su compra!</p>
      </div>
    </div>
  )
}
