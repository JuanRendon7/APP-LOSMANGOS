import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'

export const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
})

interface StatCardProps {
  icon: LucideIcon
  label: string
  valor: string | number
  sub?: string
  onClick?: () => void
  activo?: boolean
}

export function StatCard({ icon: Icono, label, valor, sub, onClick, activo }: StatCardProps) {
  const Componente = onClick ? 'button' : 'div'
  return (
    <Componente
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'w-full rounded-xl border bg-card p-4 text-left transition-colors',
        onClick && 'hover:border-primary/50',
        activo ? 'border-primary ring-1 ring-primary' : 'border-border',
      )}
    >
      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-primary">
        <Icono size={18} />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-1 font-serif text-3xl font-bold text-foreground">{valor}</p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </Componente>
  )
}

interface RangoFechasProps {
  desde: string
  hasta: string
  onDesde: (valor: string) => void
  onHasta: (valor: string) => void
}

export function RangoFechas({ desde, hasta, onDesde, onHasta }: RangoFechasProps) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      <div>
        <label htmlFor="reportes-desde" className="mb-1 block text-xs text-muted-foreground">
          Desde
        </label>
        <input
          id="reportes-desde"
          type="date"
          value={desde}
          onChange={(e) => onDesde(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      <div>
        <label htmlFor="reportes-hasta" className="mb-1 block text-xs text-muted-foreground">
          Hasta
        </label>
        <input
          id="reportes-hasta"
          type="date"
          value={hasta}
          onChange={(e) => onHasta(e.target.value)}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
      </div>
      {(desde || hasta) && (
        <button
          type="button"
          onClick={() => {
            onDesde('')
            onHasta('')
          }}
          className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary"
        >
          Limpiar
        </button>
      )}
    </div>
  )
}

export function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
        activo
          ? 'border-primary bg-primary text-primary-foreground'
          : 'border-border text-muted-foreground hover:bg-secondary',
      )}
    >
      {children}
    </button>
  )
}
