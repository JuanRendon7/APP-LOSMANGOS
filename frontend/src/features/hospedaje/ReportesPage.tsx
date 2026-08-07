import { useState } from 'react'
import { listarHabitaciones, listarReservas } from './api'

function escaparCsv(valor: string): string {
  if (/[",\n]/.test(valor)) {
    return `"${valor.replace(/"/g, '""')}"`
  }
  return valor
}

const ETIQUETAS_ESTADO: Record<string, string> = {
  RESERVADA: 'Reservada',
  CHECK_IN: 'Check-in',
  CHECK_OUT: 'Check-out',
  CANCELADA: 'Cancelada',
}

export function ReportesPage() {
  const [desde, setDesde] = useState('')
  const [hasta, setHasta] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [generando, setGenerando] = useState(false)

  const descargar = async () => {
    setError(null)
    setGenerando(true)
    try {
      const [reservas, habitaciones] = await Promise.all([
        listarReservas({ desde: desde || undefined, hasta: hasta || undefined }),
        listarHabitaciones(),
      ])
      if (reservas.length === 0) {
        setError('No hay reservas en ese rango de fechas.')
        return
      }

      const numeroPorHabitacion = new Map(
        habitaciones.map((h) => [h.id_habitacion, h.numero]),
      )
      const encabezados = [
        'Habitacion',
        'Huesped',
        'Cedula',
        'Contacto',
        'Checkin previsto',
        'Checkout previsto',
        'Checkin real',
        'Checkout real',
        'Estado',
        'Total',
      ]
      const filas = reservas.map((r) => [
        numeroPorHabitacion.get(r.id_habitacion) ?? String(r.id_habitacion),
        r.huesped.nombre,
        r.huesped.cedula,
        r.huesped.contacto,
        r.fecha_checkin_prevista,
        r.fecha_checkout_prevista,
        r.fecha_checkin_real ?? '',
        r.fecha_checkout_real ?? '',
        ETIQUETAS_ESTADO[r.estado] ?? r.estado,
        String(r.precio_total),
      ])
      const contenido = [encabezados, ...filas]
        .map((fila) => fila.map(escaparCsv).join(','))
        .join('\n')
      const blob = new Blob(['﻿' + contenido], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const sufijo = desde && hasta ? `_${desde}_a_${hasta}` : ''
      const enlace = document.createElement('a')
      enlace.href = url
      enlace.download = `reservas${sufijo}.csv`
      document.body.appendChild(enlace)
      enlace.click()
      enlace.remove()
      URL.revokeObjectURL(url)
    } catch {
      setError('No se pudo generar el reporte.')
    } finally {
      setGenerando(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-semibold text-foreground">Reportes</h1>
        <p className="text-sm text-muted-foreground">
          Descarga un reporte general de reservas filtrando por fechas.
        </p>
      </div>

      <div className="max-w-md space-y-3 rounded-xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="desde" className="mb-1 block text-sm font-medium text-foreground">
              Desde
            </label>
            <input
              id="desde"
              type="date"
              value={desde}
              onChange={(e) => setDesde(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label htmlFor="hasta" className="mb-1 block text-sm font-medium text-foreground">
              Hasta
            </label>
            <input
              id="hasta"
              type="date"
              value={hasta}
              onChange={(e) => setHasta(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <button
          onClick={descargar}
          disabled={generando}
          className="w-full rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {generando ? 'Generando...' : 'Descargar CSV'}
        </button>
        <p className="text-xs text-muted-foreground">
          Si dejas las fechas vacias, se incluyen todas las reservas.
        </p>
      </div>
    </div>
  )
}
