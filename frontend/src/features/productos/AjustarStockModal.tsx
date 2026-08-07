import { useState } from 'react'
import { ajustarStockProductoBar } from './api'
import type { ProductoBar } from './types'

interface Props {
  producto: ProductoBar
  onCerrar: () => void
  onAjustado: () => void
}

export function AjustarStockModal({ producto, onCerrar, onAjustado }: Props) {
  const [cantidad, setCantidad] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  const onSubmit = async () => {
    if (cantidad === 0) {
      setError('La cantidad no puede ser cero.')
      return
    }
    setError(null)
    setEnviando(true)
    try {
      await ajustarStockProductoBar(producto.id_producto, cantidad)
      onAjustado()
    } catch {
      setError('No se pudo ajustar el stock (¿quedaria negativo?).')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="font-semibold text-card-foreground">Ajustar stock · {producto.nombre}</h3>
          <button onClick={onCerrar} className="text-xs text-muted-foreground hover:underline">
            Cerrar
          </button>
        </div>

        <p className="mb-3 text-sm text-muted-foreground">Stock actual: {producto.stock}</p>

        <label htmlFor="cantidad" className="mb-1 block text-sm font-medium text-foreground">
          Cantidad (positiva = entrada, negativa = salida)
        </label>
        <input
          id="cantidad"
          type="number"
          step={1}
          value={cantidad}
          onChange={(e) => setCantidad(e.target.valueAsNumber || 0)}
          className="mb-3 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />

        {error && <p className="mb-3 text-sm text-destructive">{error}</p>}

        <button
          onClick={onSubmit}
          disabled={enviando}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {enviando ? 'Guardando...' : 'Confirmar ajuste'}
        </button>
      </div>
    </div>
  )
}
