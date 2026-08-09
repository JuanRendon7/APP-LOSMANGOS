import { Bell, CircleAlert, Info, TriangleAlert, X, type LucideIcon } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { cn } from '@/shared/lib/utils'
import { ESTILO_TONO } from '@/shared/ui/estado'
import { useNotificaciones } from './useNotificaciones'
import type { Notificacion } from './types'

const ICONO_NIVEL: Record<Notificacion['nivel'], LucideIcon> = {
  critical: CircleAlert,
  warning: TriangleAlert,
  info: Info,
}

const COLOR_NIVEL: Record<Notificacion['nivel'], string> = {
  critical: ESTILO_TONO.peligro.texto,
  warning: ESTILO_TONO.alerta.texto,
  info: ESTILO_TONO.info.texto,
}

const ETIQUETA_NIVEL: Record<Notificacion['nivel'], string> = {
  critical: 'Urgente',
  warning: 'Atencion',
  info: 'Informativa',
}

const BADGE_NIVEL: Record<Notificacion['nivel'], string> = {
  critical: ESTILO_TONO.peligro.badge,
  warning: ESTILO_TONO.alerta.badge,
  info: ESTILO_TONO.info.badge,
}

const PUNTO_NIVEL: Record<Notificacion['nivel'], string> = {
  critical: ESTILO_TONO.peligro.punto,
  warning: ESTILO_TONO.alerta.punto,
  info: ESTILO_TONO.info.punto,
}

export function NotificationBell() {
  const { notificaciones, leidas, pendientes, descartar, marcarLeida } = useNotificaciones()
  const [abierto, setAbierto] = useState(false)
  const [detalle, setDetalle] = useState<Notificacion | null>(null)
  const navigate = useNavigate()

  const hayCritica = notificaciones.some((n) => n.nivel === 'critical' && !leidas[n.id])
  const hayAdvertencia = notificaciones.some((n) => n.nivel === 'warning' && !leidas[n.id])
  const colorBadge = hayCritica
    ? PUNTO_NIVEL.critical
    : hayAdvertencia
      ? PUNTO_NIVEL.warning
      : 'bg-mango-600'

  const abrirDetalle = (n: Notificacion) => {
    marcarLeida(n.id)
    setDetalle(n)
  }

  const irASeccion = () => {
    if (!detalle) return
    setDetalle(null)
    setAbierto(false)
    navigate(detalle.enlace)
  }

  const eliminarDetalle = () => {
    if (!detalle) return
    descartar(detalle.id)
    setDetalle(null)
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setAbierto((v) => !v)}
        aria-label="Notificaciones"
        className="relative rounded-md p-1.5 text-marca-600 hover:bg-marca-100"
      >
        <Bell size={18} />
        {pendientes > 0 && (
          <span
            className={cn(
              'absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold text-white',
              colorBadge,
            )}
          >
            {pendientes > 9 ? '9+' : pendientes}
          </span>
        )}
      </button>

      {abierto && (
        <>
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            onClick={() => setAbierto(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div className="absolute right-0 z-50 mt-2 w-80 max-h-96 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <p className="font-serif text-sm font-semibold text-card-foreground">Notificaciones</p>
              {pendientes > 0 && (
                <span className="text-xs text-muted-foreground">{pendientes} sin abrir</span>
              )}
            </div>
            {notificaciones.length === 0 ? (
              <p className="px-3 py-6 text-center text-sm text-muted-foreground">
                Sin notificaciones nuevas.
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {notificaciones.map((n) => {
                  const Icono = ICONO_NIVEL[n.nivel]
                  const noLeida = !leidas[n.id]
                  return (
                    <li key={n.id} className="group flex items-start gap-2 px-3 py-2.5 hover:bg-secondary">
                      <button
                        type="button"
                        onClick={() => abrirDetalle(n)}
                        className="flex flex-1 items-start gap-2 text-left"
                      >
                        <Icono size={16} className={cn('mt-0.5 shrink-0', COLOR_NIVEL[n.nivel])} />
                        <span className="min-w-0">
                          <span
                            className={cn(
                              'flex items-center gap-1.5 truncate text-sm text-foreground',
                              noLeida ? 'font-semibold' : 'font-normal text-muted-foreground',
                            )}
                          >
                            {noLeida && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-mango-600" />}
                            {n.titulo}
                          </span>
                          <span className="block truncate text-xs text-muted-foreground">
                            {n.descripcion}
                          </span>
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => descartar(n.id)}
                        aria-label="Eliminar notificacion"
                        className="shrink-0 rounded p-1 text-muted-foreground opacity-0 hover:bg-muted group-hover:opacity-100"
                      >
                        <X size={13} />
                      </button>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </>
      )}

      {detalle && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-lg border border-border bg-card p-6 shadow-lg">
            <div className="mb-3 flex items-start justify-between gap-3">
              <span
                className={cn(
                  'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium',
                  BADGE_NIVEL[detalle.nivel],
                )}
              >
                {ETIQUETA_NIVEL[detalle.nivel]}
              </span>
              <button
                onClick={() => setDetalle(null)}
                className="text-xs text-muted-foreground hover:underline"
              >
                Cerrar
              </button>
            </div>
            <h3 className="font-serif text-lg font-semibold text-card-foreground">{detalle.titulo}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{detalle.descripcion}</p>

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={irASeccion}
                className="flex-1 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
              >
                Ir a la seccion
              </button>
              <button
                type="button"
                onClick={eliminarDetalle}
                className="rounded-md border border-destructive px-3 py-2 text-sm font-medium text-destructive hover:bg-secondary"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
