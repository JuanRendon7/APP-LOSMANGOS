import type { LucideIcon } from 'lucide-react'
import { cn } from '@/shared/lib/utils'
import { Tooltip } from './Tooltip'

interface Props {
  icono: LucideIcon
  etiqueta: string
  onClick: () => void
  tono?: 'default' | 'peligro' | 'exito'
  disabled?: boolean
}

const TONOS: Record<NonNullable<Props['tono']>, string> = {
  default: 'text-muted-foreground hover:bg-secondary hover:text-foreground',
  peligro: 'text-muted-foreground hover:bg-peligro-50 hover:text-peligro-700',
  exito: 'text-muted-foreground hover:bg-exito-50 hover:text-exito-700',
}

/** Boton de solo-icono con tooltip: reemplaza los links de texto "Editar",
 * "Eliminar", "Desactivar", etc. en filas de tabla / cards de accion. */
export function IconActionButton({ icono: Icono, etiqueta, onClick, tono = 'default', disabled }: Props) {
  return (
    <Tooltip texto={etiqueta}>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-label={etiqueta}
        className={cn(
          'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
          TONOS[tono],
        )}
      >
        <Icono size={16} />
      </button>
    </Tooltip>
  )
}
