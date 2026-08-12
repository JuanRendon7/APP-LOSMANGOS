import { useCallback, useEffect, useState } from 'react'
import { listarTurnosAbiertos } from './api'
import type { TurnoCaja } from './types'

/**
 * Cuando hay una sola caja abierta (el caso normal), la usa directamente sin
 * pedir nada. Cuando hay dos (diurna y nocturna simultaneas), expone la lista
 * para que la pantalla de cobro muestre un selector y el usuario elija.
 */
export function useTurnoCobro() {
  const [turnos, setTurnos] = useState<TurnoCaja[]>([])
  const [idTurno, setIdTurno] = useState<number | null>(null)
  const [cargando, setCargando] = useState(true)

  const recargar = useCallback(async () => {
    setCargando(true)
    try {
      const abiertos = await listarTurnosAbiertos()
      setTurnos(abiertos)
      setIdTurno((actual) => {
        if (actual !== null && abiertos.some((t) => t.id_turno === actual)) return actual
        return abiertos[0]?.id_turno ?? null
      })
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    recargar()
  }, [recargar])

  return { turnos, idTurno, setIdTurno, cargando, recargar }
}
