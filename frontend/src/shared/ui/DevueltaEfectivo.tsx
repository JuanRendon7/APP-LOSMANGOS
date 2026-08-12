import { useEffect, useState } from 'react'

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

interface Props {
  total: number
  className?: string
}

export function DevueltaEfectivo({ total, className = '' }: Props) {
  const [recibido, setRecibido] = useState('')

  useEffect(() => {
    if (total === 0) setRecibido('')
  }, [total])

  const recibidoNum = Number(recibido) || 0
  const devuelta = recibidoNum - total

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <input
        type="number"
        min={0}
        value={recibido}
        onChange={(e) => setRecibido(e.target.value)}
        placeholder="Recibe en efectivo"
        className="w-36 rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
      {recibido !== '' && (
        <span
          className={`text-sm font-medium ${devuelta < 0 ? 'text-destructive' : 'text-exito-700'}`}
        >
          {devuelta < 0
            ? `Falta ${formatoMoneda.format(Math.abs(devuelta))}`
            : `Devuelta ${formatoMoneda.format(devuelta)}`}
        </span>
      )}
    </div>
  )
}
