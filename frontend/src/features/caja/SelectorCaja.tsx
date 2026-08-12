import type { TurnoCaja } from './types'

const ETIQUETA_TIPO: Record<TurnoCaja['tipo'], string> = {
  DIURNO: 'Caja diurna',
  NOCTURNO: 'Caja nocturna',
}

interface Props {
  turnos: TurnoCaja[]
  idTurno: number | null
  onChange: (idTurno: number) => void
  className?: string
}

/**
 * No renderiza nada si hay una sola caja abierta (o ninguna): en ese caso no
 * hay nada que elegir. Solo aparece cuando la diurna y la nocturna estan
 * abiertas al mismo tiempo, para que el cajero indique a cual se anota el
 * movimiento.
 */
export function SelectorCaja({ turnos, idTurno, onChange, className }: Props) {
  if (turnos.length <= 1) return null

  return (
    <select
      value={idTurno ?? ''}
      onChange={(e) => onChange(Number(e.target.value))}
      className={
        className ??
        'rounded-md border border-input bg-background px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring'
      }
    >
      {turnos.map((turno) => (
        <option key={turno.id_turno} value={turno.id_turno}>
          {ETIQUETA_TIPO[turno.tipo]}
        </option>
      ))}
    </select>
  )
}
