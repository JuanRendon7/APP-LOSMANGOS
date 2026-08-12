import { useEffect, useState } from 'react'
import { useParams, useSearchParams } from 'react-router'
import { obtenerComandaConsumo } from '@/features/consumo/api'
import type { ComandaConsumo } from '@/features/consumo/types'
import { formatoFechaBogota, formatoHoraBogota } from '@/shared/lib/tiempo'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

export function ComandaHabitacionPage() {
  const { id } = useParams<{ id: string }>()
  const [searchParams] = useSearchParams()
  const [comanda, setComanda] = useState<ComandaConsumo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const itemsParam = searchParams.get('items') ?? ''

  useEffect(() => {
    if (!id || !itemsParam) return
    const ids = itemsParam
      .split(',')
      .map((valor) => Number(valor))
      .filter((valor) => Number.isFinite(valor))
    if (ids.length === 0) return
    obtenerComandaConsumo(Number(id), ids)
      .then((datos) => {
        setComanda(datos)
        setTimeout(() => window.print(), 300)
      })
      .catch(() => setError('No se pudo cargar la comanda.'))
  }, [id, itemsParam])

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>
  }
  if (!comanda) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando comanda...</p>
  }

  const fecha = new Date()
  const total = comanda.items.reduce((suma, item) => suma + item.cantidad * item.precio_unitario, 0)

  return (
    <div className="mx-auto max-w-sm bg-background p-6 font-mono text-sm text-foreground">
      <style>{'@media print { @page { margin: 8mm; } }'}</style>

      <div className="mb-4 border-b border-dashed border-border pb-3 text-center">
        <p className="text-base font-bold">Hotel Los Mangos</p>
        <p className="text-xs text-muted-foreground">Comanda de cocina</p>
      </div>

      <p>Habitacion: {comanda.numero_habitacion}</p>
      <p>Huesped: {comanda.nombre_huesped}</p>
      <p>
        Fecha: {formatoFechaBogota.format(fecha)} {formatoHoraBogota.format(fecha)}
      </p>

      <div className="my-3 border-t border-dashed border-border pt-3">
        {comanda.items.map((item) => (
          <div key={item.id_consumo} className="mb-2">
            <p className="font-semibold">
              {item.cantidad} × {item.nombre_producto}
            </p>
          </div>
        ))}
        {comanda.items.length === 0 && <p>Sin productos.</p>}
      </div>

      <div className="border-t border-dashed border-border pt-3 text-right font-semibold">
        <p>Total: {formatoMoneda.format(total)}</p>
      </div>

      <div className="mt-3 border-t border-dashed border-border pt-3 text-center text-xs text-muted-foreground">
        <p>--- Fin de la comanda ---</p>
      </div>
    </div>
  )
}
