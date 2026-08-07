import { useEffect, useState } from 'react'
import { useParams } from 'react-router'
import { obtenerPedido } from './api'
import type { Pedido } from './types'

export function ComandaPage() {
  const { id } = useParams<{ id: string }>()
  const [pedido, setPedido] = useState<Pedido | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    obtenerPedido(Number(id))
      .then((datos) => {
        setPedido(datos)
        setTimeout(() => window.print(), 300)
      })
      .catch(() => setError('No se pudo cargar el pedido.'))
  }, [id])

  if (error) {
    return <p className="p-6 text-sm text-destructive">{error}</p>
  }
  if (!pedido) {
    return <p className="p-6 text-sm text-muted-foreground">Cargando comanda...</p>
  }

  const fecha = new Date(pedido.creado_en)

  return (
    <div className="mx-auto max-w-sm bg-background p-6 font-mono text-sm text-foreground">
      <style>{'@media print { @page { margin: 8mm; } }'}</style>

      <div className="mb-4 border-b border-dashed border-border pb-3 text-center">
        <p className="text-base font-bold">Hotel Los Mangos</p>
        <p className="text-xs text-muted-foreground">Comanda de cocina</p>
      </div>

      <p>Mesa: {pedido.nombre_mesa}</p>
      <p>
        Fecha: {fecha.toLocaleDateString('es-CO')} {fecha.toLocaleTimeString('es-CO')}
      </p>
      <p>Pedido #{pedido.id_pedido}</p>

      <div className="my-3 border-t border-dashed border-border pt-3">
        {pedido.items.map((item) => (
          <div key={item.id_item} className="mb-2">
            <p className="font-semibold">
              {item.cantidad} × {item.nombre_producto}
            </p>
            {item.nota && <p className="pl-3 text-xs">Nota: {item.nota}</p>}
          </div>
        ))}
        {pedido.items.length === 0 && <p>Sin productos.</p>}
      </div>

      <div className="border-t border-dashed border-border pt-3 text-center text-xs text-muted-foreground">
        <p>--- Fin de la comanda ---</p>
      </div>
    </div>
  )
}
